from flask import Flask, render_template, request, jsonify
import difflib
import requests
from bs4 import BeautifulSoup
import re
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

app = Flask(__name__)

nltk.download('punkt_tab')
nltk.download('stopwords')

def preprocess_text(text):
    # Convert to lowercase
    text = text.lower()
    # Remove special characters and numbers
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    # Tokenize
    tokens = word_tokenize(text)
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words]
    return ' '.join(tokens)

def check_plagiarism(text1, text2):
    # Preprocess both texts
    processed1 = preprocess_text(text1)
    processed2 = preprocess_text(text2)
    
    # Create TF-IDF vectors
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([processed1, processed2])
    
    # Calculate cosine similarity
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    
    return round(similarity * 100, 2)

def find_similar_phrases(text1, text2):
    d = difflib.Differ()
    diff = list(d.compare(text1.split(), text2.split()))
    
    similar_phrases = []
    current_phrase = []
    
    for word in diff:
        if word.startswith('  '):  # Words that are the same in both
            current_phrase.append(word[2:])
        else:
            if current_phrase:
                similar_phrases.append(' '.join(current_phrase))
                current_phrase = []
    
    if current_phrase:
        similar_phrases.append(' '.join(current_phrase))
    
    return similar_phrases

def search_web(text, num_results=5):
    try:
        query = '+'.join(text.split()[:5])  # Use first 5 words as query
        url = f"https://www.google.com/search?q={query}&num={num_results}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        results = []
        for g in soup.find_all('div', class_='g'):
            anchor = g.find('a')
            if anchor:
                link = anchor['href']
                title = g.find('h3').text if g.find('h3') else ''
                snippet = g.find('div', class_='IsZvec').text if g.find('div', class_='IsZvec') else ''
                
                if link.startswith('/url?q='):
                    link = link[7:].split('&')[0]
                
                if link.startswith('http'):
                    results.append({
                        'title': title,
                        'link': link,
                        'snippet': snippet
                    })
        
        return results[:num_results]
    except Exception as e:
        print(f"Error in web search: {e}")
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/check', methods=['POST'])
def check():
    if request.method == 'POST':
        text1 = request.form.get('text1', '')
        text2 = request.form.get('text2', '')
        url = request.form.get('url', '')
        file = request.files.get('file')
        
        if not (text1 or text2 or url or file):
            return jsonify({'error': 'No input provided'}), 400
        
        # If URL is provided, fetch content
        if url:
            try:
                response = requests.get(url)
                soup = BeautifulSoup(response.text, 'html.parser')
                text2 = ' '.join([p.get_text() for p in soup.find_all('p')])
            except:
                return jsonify({'error': 'Could not fetch URL content'}), 400
        
        # If file is uploaded, read content
        elif file:
            try:
                if file.filename.endswith('.txt'):
                    text2 = file.read().decode('utf-8')
                else:
                    return jsonify({'error': 'Unsupported file format. Please upload a .txt file'}), 400
            except:
                return jsonify({'error': 'Could not read file content'}), 400
        
        # If comparing two texts
        if text1 and text2:
            similarity = check_plagiarism(text1, text2)
            similar_phrases = find_similar_phrases(text1, text2)
            
            return jsonify({
                'similarity': similarity,
                'similar_phrases': similar_phrases,
                'text1': text1,
                'text2': text2,
                'type': 'text'
            })
        
        # If checking single text against web
        elif text1 and not text2:
            web_results = search_web(text1)
            similarities = []
            
            for result in web_results:
                try:
                    response = requests.get(result['link'], timeout=5)
                    soup = BeautifulSoup(response.text, 'html.parser')
                    web_text = ' '.join([p.get_text() for p in soup.find_all('p')])
                    similarity = check_plagiarism(text1, web_text)
                    similarities.append({
                        'title': result['title'],
                        'link': result['link'],
                        'snippet': result['snippet'],
                        'similarity': similarity
                    })
                except:
                    continue
            
            # Sort by similarity (descending)
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            
            return jsonify({
                'results': similarities,
                'text1': text1,
                'type': 'web'
            })
        
        else:
            return jsonify({'error': 'Invalid input combination'}), 400

@app.route('/results')
def results():
    return render_template('results.html')

if __name__ == '__main__':
    app.run(debug=True)