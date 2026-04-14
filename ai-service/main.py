from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import math
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

app = FastAPI(title="Smarteye - AI Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Models ====================

class TextAnalysisRequest(BaseModel):
    text: str
    images: Optional[List[str]] = []

class PriorityRequest(BaseModel):
    category: str
    severity: str
    text: str
    upvotes: Optional[int] = 0
    has_image: Optional[bool] = False

class DuplicateCheckRequest(BaseModel):
    text: str
    latitude: float
    longitude: float
    category: str
    existing_issues: Optional[List[dict]] = []

class ClusterRequest(BaseModel):
    issues: List[dict]
    eps_km: Optional[float] = 0.5

class ChatbotRequest(BaseModel):
    message: str

# ==================== Keyword Database ====================

CATEGORY_KEYWORDS = {
    'pothole': {
        'keywords': ['pothole', 'pit', 'hole', 'crater', 'bump', 'dip', 'cavity', 'road damage', 'depression', 'broken road surface'],
        'weight': 1.0
    },
    'garbage': {
        'keywords': ['garbage', 'trash', 'waste', 'dump', 'litter', 'rubbish', 'debris', 'dirty', 'stink', 'smell', 'rotting', 'unhygienic', 'filthy'],
        'weight': 1.0
    },
    'water-leakage': {
        'keywords': ['water', 'leak', 'pipe', 'flooding', 'burst', 'overflow', 'sewage', 'waterlogging', 'tap', 'supply', 'plumbing'],
        'weight': 1.0
    },
    'broken-streetlight': {
        'keywords': ['streetlight', 'street light', 'lamp', 'dark', 'bulb', 'illumination', 'lighting', 'light pole', 'not working light', 'broken light'],
        'weight': 1.0
    },
    'drainage': {
        'keywords': ['drain', 'drainage', 'clog', 'blocked', 'sewer', 'manhole', 'gutter', 'storm drain', 'water stagnation', 'waterlog'],
        'weight': 1.0
    },
    'electricity': {
        'keywords': ['electric', 'power', 'wire', 'cable', 'outage', 'spark', 'transformer', 'voltage', 'short circuit', 'electrocution'],
        'weight': 1.0
    },
    'road-damage': {
        'keywords': ['road', 'crack', 'asphalt', 'pavement', 'surface', 'uneven', 'crumbling', 'worn out', 'deteriorated'],
        'weight': 0.8
    }
}

SEVERITY_KEYWORDS = {
    'high': ['dangerous', 'urgent', 'emergency', 'critical', 'severe', 'accident', 'hazard', 'risk', 'injury', 
             'flood', 'electrocution', 'life threatening', 'immediate', 'collapse', 'major', 'serious'],
    'medium': ['growing', 'increasing', 'multiple', 'several', 'affecting', 'blocked', 'broken', 'damaged', 'not working'],
    'low': ['minor', 'small', 'slight', 'little', 'cosmetic', 'inconvenience']
}

# ==================== AI Logic ====================

def classify_text(text: str) -> dict:
    """Classify civic issue from text description using NLP"""
    lower = text.lower()
    scores = {}
    
    for category, data in CATEGORY_KEYWORDS.items():
        score = 0
        matched_keywords = []
        for keyword in data['keywords']:
            if keyword in lower:
                score += data['weight']
                matched_keywords.append(keyword)
        scores[category] = {'score': score, 'matched': matched_keywords}
    
    best_category = max(scores, key=lambda k: scores[k]['score'])
    max_score = scores[best_category]['score']
    
    if max_score == 0:
        return {'category': 'other', 'confidence': 0.3, 'matched_keywords': []}
    
    confidence = min(0.5 + max_score * 0.12, 0.95)
    return {
        'category': best_category,
        'confidence': round(confidence, 2),
        'matched_keywords': scores[best_category]['matched']
    }

def assess_severity(text: str, category: str) -> dict:
    """Assess severity level from text"""
    lower = text.lower()
    
    high_score = sum(1 for w in SEVERITY_KEYWORDS['high'] if w in lower)
    medium_score = sum(1 for w in SEVERITY_KEYWORDS['medium'] if w in lower)
    low_score = sum(1 for w in SEVERITY_KEYWORDS['low'] if w in lower)
    
    # Some categories are inherently higher severity
    high_priority_categories = ['electricity', 'water-leakage', 'pothole']
    if category in high_priority_categories:
        high_score += 1
    
    if high_score >= 2 or (high_score >= 1 and medium_score >= 1):
        return {'severity': 'high', 'confidence': min(0.6 + high_score * 0.1, 0.95)}
    elif medium_score >= 1 or high_score >= 1:
        return {'severity': 'medium', 'confidence': min(0.5 + medium_score * 0.1, 0.9)}
    else:
        return {'severity': 'low', 'confidence': 0.6}

def calculate_priority(category: str, severity: str, text: str, upvotes: int = 0, has_image: bool = False) -> int:
    """Calculate priority score 0-100"""
    base_scores = {
        'electricity': 30, 'water-leakage': 28, 'pothole': 25,
        'drainage': 22, 'garbage': 20, 'broken-streetlight': 18,
        'road-damage': 15, 'other': 10
    }
    
    score = base_scores.get(category, 10)
    
    severity_multiplier = {'high': 2.5, 'medium': 1.8, 'low': 1.0}
    score *= severity_multiplier.get(severity, 1.0)
    
    # Urgency keywords bonus
    urgent_words = ['dangerous', 'emergency', 'urgent', 'critical', 'immediate', 'life']
    urgent_count = sum(1 for w in urgent_words if w in text.lower())
    score += urgent_count * 5
    
    # Upvote bonus
    score += min(upvotes * 2, 15)
    
    # Image bonus (more credible)
    if has_image:
        score += 5
    
    return min(max(int(score), 5), 100)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def check_duplicates(text: str, lat: float, lng: float, category: str, existing: list) -> dict:
    """Check for duplicate/similar issues"""
    if not existing:
        return {'is_duplicate': False, 'similar_issues': [], 'duplicate_score': 0}
    
    similar = []
    
    for issue in existing:
        score = 0
        reasons = []
        
        # Location similarity
        issue_lat = issue.get('latitude', issue.get('lat', 0))
        issue_lng = issue.get('longitude', issue.get('lng', 0))
        distance = haversine_distance(lat, lng, issue_lat, issue_lng)
        
        if distance < 0.1:  # Within 100m
            score += 40
            reasons.append(f'Within {int(distance*1000)}m')
        elif distance < 0.5:  # Within 500m
            score += 20
            reasons.append(f'Within {int(distance*1000)}m')
        
        # Category match
        if issue.get('category') == category:
            score += 30
            reasons.append('Same category')
        
        # Text similarity
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf = vectorizer.fit_transform([text, issue.get('description', '')])
            text_sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
            if text_sim > 0.3:
                score += int(text_sim * 30)
                reasons.append(f'Text similarity: {text_sim:.0%}')
        except:
            pass
        
        if score >= 50:
            similar.append({
                'issue_id': issue.get('_id', issue.get('id', '')),
                'score': score,
                'reasons': reasons
            })
    
    similar.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        'is_duplicate': len(similar) > 0 and similar[0]['score'] >= 70,
        'similar_issues': similar[:5],
        'duplicate_score': similar[0]['score'] if similar else 0
    }

def cluster_issues(issues: list, eps_km: float = 0.5) -> list:
    """DBSCAN-like clustering of issues by location"""
    if not issues:
        return []
    
    clusters = []
    visited = set()
    
    for i, issue in enumerate(issues):
        if i in visited:
            continue
        
        cluster = [issue]
        visited.add(i)
        lat1 = issue.get('latitude', issue.get('lat', 0))
        lng1 = issue.get('longitude', issue.get('lng', 0))
        
        for j, other in enumerate(issues):
            if j in visited:
                continue
            lat2 = other.get('latitude', other.get('lat', 0))
            lng2 = other.get('longitude', other.get('lng', 0))
            
            if haversine_distance(lat1, lng1, lat2, lng2) <= eps_km:
                cluster.append(other)
                visited.add(j)
        
        if len(cluster) >= 2:
            center_lat = np.mean([c.get('latitude', c.get('lat', 0)) for c in cluster])
            center_lng = np.mean([c.get('longitude', c.get('lng', 0)) for c in cluster])
            clusters.append({
                'center': {'lat': float(center_lat), 'lng': float(center_lng)},
                'count': len(cluster),
                'issues': [c.get('_id', c.get('id', '')) for c in cluster],
                'categories': list(set(c.get('category', 'other') for c in cluster))
            })
    
    return clusters

# ==================== Chatbot ====================

CHATBOT_INTENTS = {
    'greeting': {
        'patterns': ['hello', 'hi', 'hey', 'good morning', 'good evening', 'namaste'],
        'response': "👋 Hello! I'm Smarteye Assistant. I can help you:\n\n• **Report a civic issue** (potholes, garbage, leaks)\n• **Track complaint status** in real-time\n• **Find nearby issues** on the map\n\nWhat would you like to do?"
    },
    'report_help': {
        'patterns': ['report', 'complaint', 'file', 'submit', 'register issue', 'new issue', 'raise'],
        'response': "📝 To report an issue:\n\n1. Click **Report Issue** in the navigation\n2. Upload a photo or use voice description 🎤\n3. Allow GPS to auto-detect location\n4. AI will classify the issue type & priority\n5. Submit and get a tracking ID!\n\nYour issue will be auto-assigned to the right department."
    },
    'status_help': {
        'patterns': ['status', 'track', 'where', 'update', 'progress', 'when', 'how long'],
        'response': "📊 Track your complaints via **My Issues** page:\n\n**Status flow:** Submitted → In Progress → Resolved\n\nYou'll get real-time notifications on status changes. High priority issues have 72-hour SLA!"
    },
    'categories': {
        'patterns': ['type', 'category', 'categories', 'kind', 'what issues', 'what can'],
        'response': "🏷️ We handle:\n\n• 🕳️ Potholes & road damage\n• 🗑️ Garbage & waste\n• 💧 Water leakage & supply\n• 💡 Broken streetlights\n• 🌊 Drainage & sewage\n• ⚡ Electrical hazards\n\nOur AI auto-detects categories from photos & descriptions!"
    },
    'emergency': {
        'patterns': ['emergency', 'danger', 'urgent', 'life threatening', 'electric shock', 'flood'],
        'response': "🚨 **Emergency detected!**\n\nFor life-threatening emergencies, please call **112** immediately.\n\nYou can also report it here with HIGH priority - we'll escalate it to the concerned department right away."
    }
}

def chatbot_response(message: str) -> dict:
    lower = message.lower()
    
    for intent, data in CHATBOT_INTENTS.items():
        if any(pattern in lower for pattern in data['patterns']):
            return {
                'text': data['response'],
                'intent': intent,
                'suggestions': ['Report an issue', 'Track my complaint', 'View map', 'Show categories']
            }
    
    return {
        'text': "🤖 I can help you with:\n\n• **Reporting civic issues** with AI detection\n• **Tracking complaint** status\n• **Viewing issues on map**\n• **Understanding categories**\n\nTry asking me about any of these topics!",
        'intent': 'general',
        'suggestions': ['How to report?', 'Track issue', 'What categories?', 'Emergency help']
    }

# ==================== API Routes ====================

@app.get("/")
async def root():
    return {"service": "Smarteye AI Microservice", "status": "active", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "AI Microservice"}

@app.post("/api/analyze-text")
async def analyze_text(request: TextAnalysisRequest):
    classification = classify_text(request.text)
    severity = assess_severity(request.text, classification['category'])
    priority = calculate_priority(
        classification['category'], severity['severity'], request.text,
        has_image=len(request.images) > 0
    )
    
    return {
        'category': classification['category'],
        'confidence': classification['confidence'],
        'severity': severity['severity'],
        'severity_confidence': severity['confidence'],
        'priority_score': priority,
        'matched_keywords': classification['matched_keywords'],
        'department': get_department(classification['category'])
    }

@app.post("/api/classify-image")
async def classify_image(file: UploadFile = File(...)):
    """Classify an uploaded image (placeholder - returns demo data)"""
    return {
        'category': 'pothole',
        'confidence': 0.78,
        'objects_detected': ['road_damage', 'pothole'],
        'note': 'Image classification model placeholder - integrate TensorFlow/ONNX model here'
    }

@app.post("/api/priority-score")
async def priority_score(request: PriorityRequest):
    score = calculate_priority(
        request.category, request.severity, request.text,
        request.upvotes, request.has_image
    )
    return {'priority_score': score, 'category': request.category, 'severity': request.severity}

@app.post("/api/check-duplicate")
async def check_duplicate(request: DuplicateCheckRequest):
    result = check_duplicates(
        request.text, request.latitude, request.longitude,
        request.category, request.existing_issues
    )
    return result

@app.post("/api/cluster-issues")
async def cluster(request: ClusterRequest):
    clusters = cluster_issues(request.issues, request.eps_km)
    return {'clusters': clusters, 'total_clusters': len(clusters)}

@app.post("/api/chatbot")
async def chatbot(request: ChatbotRequest):
    return chatbot_response(request.message)

def get_department(category: str) -> str:
    departments = {
        'pothole': 'Roads & Infrastructure',
        'garbage': 'Sanitation & Waste',
        'water-leakage': 'Water Supply',
        'broken-streetlight': 'Electrical & Lighting',
        'drainage': 'Drainage & Sewage',
        'electricity': 'Electrical & Lighting',
        'road-damage': 'Roads & Infrastructure',
        'other': 'General Maintenance'
    }
    return departments.get(category, 'General Maintenance')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
