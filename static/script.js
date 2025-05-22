document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // File upload display
    const fileUpload = document.getElementById('file-upload');
    const fileName = document.getElementById('file-name');
    
    if (fileUpload && fileName) {
        fileUpload.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileName.textContent = this.files[0].name;
            } else {
                fileName.textContent = 'No file chosen';
            }
        });
    }
    
    // Loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }
    
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }
    
    // Check plagiarism for text comparison
    const checkBtn = document.getElementById('check-btn');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            const text1 = document.getElementById('text1').value.trim();
            const text2 = document.getElementById('text2').value.trim();
            const url = document.getElementById('url').value.trim();
            const file = document.getElementById('file-upload').files[0];
            
            if (!text1 && !text2 && !url && !file) {
                alert('Please enter some text to compare');
                return;
            }
            
            showLoading();
            
            const formData = new FormData();
            if (text1) formData.append('text1', text1);
            if (text2) formData.append('text2', text2);
            if (url) formData.append('url', url);
            if (file) formData.append('file', file);
            
            fetch('/check', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                // Store results in session storage
                sessionStorage.setItem('plagiarismResults', JSON.stringify(data));
                
                // Redirect to results page
                window.location.href = '/results';
            })
            .catch(error => {
                hideLoading();
                console.error('Error:', error);
                alert('An error occurred while checking for plagiarism');
            });
        });
    }
    
    // Check plagiarism against web
    const webCheckBtn = document.getElementById('web-check-btn');
    if (webCheckBtn) {
        webCheckBtn.addEventListener('click', function() {
            const text = document.getElementById('web-text').value.trim();
            
            if (!text) {
                alert('Please enter some text to check against web');
                return;
            }
            
            showLoading();
            
            const formData = new FormData();
            formData.append('text1', text);
            
            fetch('/check', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                // Store results in session storage
                sessionStorage.setItem('plagiarismResults', JSON.stringify(data));
                
                // Redirect to results page
                window.location.href = '/results';
            })
            .catch(error => {
                hideLoading();
                console.error('Error:', error);
                alert('An error occurred while checking for plagiarism');
            });
        });
    }
    
    // Display results on results page
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        const results = JSON.parse(sessionStorage.getItem('plagiarismResults'));
        
        if (!results) {
            window.location.href = '/';
            return;
        }
        
        // Display similarity score
        const similarityPercent = document.getElementById('similarity-percent');
        const circleProgress = document.querySelector('.circle-progress');
        const summaryText = document.getElementById('summary-text');
        
        similarityPercent.textContent = `${results.similarity}%`;
        
        // Calculate rotation for circle progress (180deg = 100%)
        const rotation = (results.similarity / 100) * 180;
        circleProgress.style.transform = `rotate(${rotation}deg)`;
        
        // Set summary text based on similarity
        if (results.similarity < 20) {
            summaryText.textContent = "Your content appears to be highly original with minimal matches found.";
            summaryText.style.color = 'var(--success-color)';
        } else if (results.similarity < 50) {
            summaryText.textContent = "Your content has some similarities with other sources but appears to be mostly original.";
            summaryText.style.color = 'var(--warning-color)';
        } else {
            summaryText.textContent = "Your content has significant similarities with other sources. Consider revising or properly citing the matched content.";
            summaryText.style.color = 'var(--error-color)';
        }
        
        // Display text comparison if available
        if (results.type === 'text' && results.text1 && results.text2) {
            document.getElementById('original-text').textContent = results.text1;
            document.getElementById('compared-text').textContent = results.text2;
            
            // Highlight similar phrases
            if (results.similar_phrases && results.similar_phrases.length > 0) {
                const phrasesList = document.getElementById('similar-phrases-list');
                results.similar_phrases.forEach(phrase => {
                    if (phrase.trim().length > 0) {
                        const badge = document.createElement('span');
                        badge.className = 'phrase-badge';
                        badge.textContent = phrase;
                        phrasesList.appendChild(badge);
                    }
                });
            } else {
                document.getElementById('similar-phrases-section').style.display = 'none';
            }
        } else {
            document.getElementById('text-comparison-section').style.display = 'none';
            document.getElementById('similar-phrases-section').style.display = 'none';
        }
        
        // Display web results if available
        if (results.type === 'web' && results.results && results.results.length > 0) {
            const webResultsList = document.getElementById('web-results-list');
            
            results.results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'web-result-item';
                
                resultItem.innerHTML = `
                    <h3>${result.title || 'Untitled'}</h3>
                    <a href="${result.link}" target="_blank">${result.link}</a>
                    <p>${result.snippet || 'No snippet available'}</p>
                    <span class="similarity-badge">${result.similarity}% Similar</span>
                `;
                
                webResultsList.appendChild(resultItem);
            });
        } else {
            document.getElementById('web-results-section').style.display = 'none';
        }
        
        // New check button
        document.getElementById('new-check-btn').addEventListener('click', () => {
            window.location.href = '/';
        });
        
        // Download report button
        document.getElementById('download-report-btn').addEventListener('click', () => {
            alert('Report download functionality would be implemented here');
            // In a real implementation, this would generate a PDF or text report
        });
    }
    
    // Fetch URL content
    const fetchUrlBtn = document.getElementById('fetch-url-btn');
    if (fetchUrlBtn) {
        fetchUrlBtn.addEventListener('click', function() {
            const urlInput = document.getElementById('url');
            const url = urlInput.value.trim();
            
            if (!url) {
                alert('Please enter a URL');
                return;
            }
            
            showLoading();
            
            fetch(`/check?url=${encodeURIComponent(url)}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                document.getElementById('text2').value = data.text2;
                urlInput.value = '';
            })
            .catch(error => {
                hideLoading();
                console.error('Error:', error);
                alert('An error occurred while fetching URL content');
            });
        });
    }
});