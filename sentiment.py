from textblob import TextBlob

# ── Keyword dictionaries ───────────────────────────────────────
KEYWORDS = {
    'positive': [
        'excellent', 'good', 'great', 'best', 'effective', 'friendly',
        'supportive', 'clear', 'helpful', 'wonderful', 'amazing', 'fantastic',
        'knowledgeable', 'engaging', 'interesting', 'inspiring', 'patient',
        'thorough', 'organized', 'informative', 'brilliant', 'motivating',
    ],
    'negative': [
        'bad', 'poor', 'worst', 'confusing', 'boring', 'slow', 'unhelpful',
        'rude', 'strict', 'unclear', 'lazy', 'difficult', 'terrible',
        'disappointing', 'waste', 'monotonous', 'irrelevant', 'disorganized',
        'unresponsive', 'arrogant', 'unfair', 'outdated',
    ],
}

WEIGHT_PER_KEYWORD = 0.12   # polarity bump per matched keyword
BLOB_WEIGHT        = 0.65   # blend ratio for TextBlob vs keyword score
KEYWORD_WEIGHT     = 0.35


def analyze_sentiment(text: str) -> tuple[str, float]:
    """
    Blended sentiment: TextBlob polarity + keyword counting.

    Returns:
        label  – "Positive", "Neutral", or "Negative"
        score  – float in [-1.0, 1.0]
    """
    if not text or not text.strip():
        return 'Neutral', 0.0

    blob = TextBlob(text)
    blob_score = blob.sentiment.polarity   # -1 to 1

    text_lower = text.lower()
    kw_score = 0.0
    for word in KEYWORDS['positive']:
        if word in text_lower:
            kw_score += WEIGHT_PER_KEYWORD
    for word in KEYWORDS['negative']:
        if word in text_lower:
            kw_score -= WEIGHT_PER_KEYWORD

    # Weighted blend
    final = BLOB_WEIGHT * blob_score + KEYWORD_WEIGHT * kw_score
    final = round(max(-1.0, min(1.0, final)), 3)

    if final > 0.1:
        label = 'Positive'
    elif final < -0.1:
        label = 'Negative'
    else:
        label = 'Neutral'

    return label, final


def extract_key_points(feedback_list: list[dict]) -> tuple[list[str], list[str]]:
    """
    Returns top positive & negative keywords found across a list of
    feedback objects (each must have a 'feedback_text' key).
    """
    compliment_counts: dict[str, int] = {}
    complaint_counts:  dict[str, int] = {}

    for f in feedback_list:
        text  = f.get('feedback_text', '').lower()
        label = f.get('sentiment_label') or analyze_sentiment(text)[0]

        tokens = set(text.split())
        if label == 'Positive':
            for w in KEYWORDS['positive']:
                if w in tokens:
                    compliment_counts[w] = compliment_counts.get(w, 0) + 1
        elif label == 'Negative':
            for w in KEYWORDS['negative']:
                if w in tokens:
                    complaint_counts[w] = complaint_counts.get(w, 0) + 1

    # Sort by frequency and return top 8
    compliments = [w for w, _ in sorted(compliment_counts.items(), key=lambda x: -x[1])][:8]
    complaints  = [w for w, _ in sorted(complaint_counts.items(),  key=lambda x: -x[1])][:8]

    return compliments, complaints
