class SummarAI {
    constructor() {
      // Initialize UI elements
      this.apiKeyInput = document.getElementById('apiKey');
      this.saveKeyBtn = document.getElementById('saveKey');
      this.summarizeBtn = document.getElementById('summarize');
      this.status = document.getElementById('status');
      this.output = document.getElementById('output');
      this.languageSelect = document.getElementById('language');
      this.qaSection = document.getElementById('qaSection');
      this.questionInput = document.getElementById('questionInput');
      this.askButton = document.getElementById('askQuestion');
      this.answerOutput = document.getElementById('answerOutput');
      this.currentSummary = '';
  
      // Load saved API key and add event listeners
      this.loadApiKey();
      this.addEventListeners();
  
      // Hide Q&A section initially
      this.qaSection.style.display = 'none';
  
      // Add to existing constructor
      this.settingsBtn = document.getElementById('settingsBtn');
      this.settingsPanel = document.getElementById('settingsPanel');
      this.closeSettings = document.getElementById('closeSettings');
      this.themeOptions = document.querySelectorAll('.theme-option');
  
      this.initializeSettings();
      this.loadTheme();
  
      // Debug log
      console.log('Settings button:', this.settingsBtn);
      console.log('Settings panel:', this.settingsPanel);
      console.log('Close button:', this.closeSettings);
  
      // Add settings event listeners
      if (this.settingsBtn && this.settingsPanel && this.closeSettings) {
        this.settingsBtn.addEventListener('click', () => {
          console.log('Settings clicked');
          this.settingsPanel.classList.add('visible');
        });
  
        this.closeSettings.addEventListener('click', () => {
          console.log('Close clicked');
          this.settingsPanel.classList.remove('visible');
        });
      } else {
        console.error('Settings elements not found!');
      }
    }
  
    async loadApiKey() {
      const { apiKey } = await chrome.storage.sync.get('apiKey');
      if (apiKey) {
        this.apiKeyInput.value = apiKey;
        this.summarizeBtn.disabled = false;
      }
    }
  
    addEventListeners() {
      this.saveKeyBtn.addEventListener('click', () => this.saveApiKey());
      this.summarizeBtn.addEventListener('click', () => this.summarizePage());
      this.apiKeyInput.addEventListener('input', () => {
        this.summarizeBtn.disabled = !this.apiKeyInput.value.trim();
      });
      this.askButton.addEventListener('click', () => this.askQuestion());
    }
  
    async saveApiKey() {
      const apiKey = this.apiKeyInput.value.trim();
      if (!apiKey) return;
  
      try {
        await chrome.storage.sync.set({ apiKey });
        this.setStatus('API key saved!', false, true);
        this.summarizeBtn.disabled = false;
        setTimeout(() => this.setStatus(''), 2000);
      } catch (error) {
        this.setStatus('Failed to save API key', true);
      }
    }
  
    async summarizePage() {
      try {
        this.setStatus('Getting page content...');
        this.summarizeBtn.disabled = true;
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const content = await this.getPageContent(tab);
        
        this.setStatus('Generating summary...');
        const summary = await this.generateSummary(content);
        
        this.showOutput(summary);
        this.setStatus('');
      } catch (error) {
        this.setStatus(`Error: ${error.message}`, true);
      } finally {
        this.summarizeBtn.disabled = false;
      }
    }
  
    async getPageContent(tab) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const article = document.querySelector('article, [role="main"], main');
          const content = article ? article.textContent : document.body.textContent;
          return content.trim();
        }
      });
      return result;
    }
  
    async generateSummary(content) {
      const language = this.languageSelect.value;
      const languagePrompt = language !== 'en' ? 
        `Respond in ${this.getLanguageName(language)}. ` : '';
  
      // Truncate content more aggressively
      const maxChars = 12000; // Reduced from 25000
      const truncatedContent = content.slice(0, maxChars);
  
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKeyInput.value.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [{
            role: "user",
            content: `${languagePrompt}Please provide a comprehensive summary of this text in 3-4 paragraphs:\n\n${truncatedContent}`
          }],
          temperature: 0.7,
          max_tokens: 1000 // Reduced from 1500
        })
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API Error');
      }
  
      const data = await response.json();
      return data.choices[0].message.content;
    }
  
    showOutput(text) {
      // Store the summary for Q&A
      this.currentSummary = text;
  
      // Clear and prepare output
      this.output.innerHTML = `
        <div class="output-header">
          <button class="icon-button" id="copyButton">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/>
            </svg>
          </button>
        </div>
        <div id="summaryContent"></div>
      `;
  
      // Add copy functionality
      const copyButton = document.getElementById('copyButton');
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
          this.showCopyNotification();
        });
      });
  
      // Type text and show Q&A section after
      this.typeText(text, document.getElementById('summaryContent')).then(() => {
        // Show Q&A section only after summary is complete
        setTimeout(() => {
          this.qaSection.style.display = 'block';
          this.qaSection.classList.add('visible');
        }, 500);
      });
    }
  
    showCopyNotification() {
      const notification = document.createElement('div');
      notification.className = 'copy-notification';
      notification.textContent = 'Copied to clipboard';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 2000);
    }
  
    async typeText(text, element, speed = 8) {
      const words = text.split(' ');
      element.textContent = '';
  
      const wordsPerBatch = 3;
      for (let i = 0; i < words.length; i += wordsPerBatch) {
        const batch = words.slice(i, i + wordsPerBatch).join(' ') + ' ';
        element.textContent += batch;
        element.scrollTop = element.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return Promise.resolve();
    }
  
    getLanguageName(code) {
      const languages = {
        en: 'English',
        nl: 'Dutch',
        fr: 'French',
        de: 'German',
        es: 'Spanish'
      };
      return languages[code] || 'English';
    }
  
    setStatus(message, isError = false, isSuccess = false) {
      this.status.textContent = message;
      this.status.style.color = isError ? '#EF4444' : isSuccess ? '#10B981' : '#6366F1';
    }
  
    async askQuestion() {
      const question = this.questionInput.value.trim();
      if (!question || !this.currentSummary) return;
  
      try {
        this.askButton.disabled = true;
        this.setStatus('Getting answer...');
  
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKeyInput.value.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "mixtral-8x7b-32768",
            messages: [
              {
                role: "system",
                content: "Answer questions based on the provided summary."
              },
              {
                role: "user",
                content: `Summary: ${this.currentSummary}\n\nQuestion: ${question}`
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'API Error');
        }
  
        const data = await response.json();
        const answer = data.choices[0].message.content;
  
        // Show answer with copy button
        this.answerOutput.innerHTML = `
          <div class="output-header">
            <button class="icon-button" id="copyAnswerButton">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/>
              </svg>
            </button>
          </div>
          <div id="answerContent"></div>
        `;
  
        const copyButton = document.getElementById('copyAnswerButton');
        copyButton.addEventListener('click', () => {
          navigator.clipboard.writeText(answer).then(() => {
            this.showCopyNotification();
          });
        });
  
        this.typeText(answer, document.getElementById('answerContent'));
        this.questionInput.value = '';
        this.setStatus('');
      } catch (error) {
        this.setStatus(`Error: ${error.message}`, true);
      } finally {
        this.askButton.disabled = false;
      }
    }
  
    initializeSettings() {
      this.settingsBtn.addEventListener('click', () => {
        console.log('Settings clicked'); // Debug log
        this.settingsPanel.classList.add('visible');
      });
  
      this.closeSettings.addEventListener('click', () => {
        console.log('Close clicked'); // Debug log
        this.settingsPanel.classList.remove('visible');
      });
  
      this.themeOptions.forEach(option => {
        option.addEventListener('click', () => {
          console.log('Theme clicked:', option.dataset.theme); // Debug log
          this.setTheme(option.dataset.theme);
          this.themeOptions.forEach(opt => opt.classList.remove('active'));
          option.classList.add('active');
        });
      });
  
      // Click outside to close
      document.addEventListener('click', (e) => {
        if (this.settingsPanel.classList.contains('visible') && 
            !this.settingsPanel.contains(e.target) && 
            !this.settingsBtn.contains(e.target)) {
          this.settingsPanel.classList.remove('visible');
        }
      });
    }
  
    async loadTheme() {
      try {
        const { theme } = await chrome.storage.sync.get('theme');
        if (theme) {
          this.setTheme(theme);
          this.themeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
          });
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    }
  
    setTheme(theme) {
      const themes = {
        default: {
          background: 'linear-gradient(125deg, #0F172A 0%, #1E293B 100%)',
          accent: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
        },
        purple: {
          background: 'linear-gradient(125deg, #2E1065 0%, #4C1D95 100%)',
          accent: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)'
        },
        ocean: {
          background: 'linear-gradient(125deg, #0C4A6E 0%, #164E63 100%)',
          accent: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
        },
        forest: {
          background: 'linear-gradient(125deg, #064E3B 0%, #065F46 100%)',
          accent: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        }
      };
  
      const selectedTheme = themes[theme] || themes.default;
      
      // Update background with more dramatic gradient
      document.querySelector('.background').style.background = `
        ${selectedTheme.background},
        radial-gradient(circle at top right, rgba(255,255,255,0.1), transparent 400px)
      `;
      
      // Update buttons
      document.querySelectorAll('button:not(.icon-button)').forEach(button => {
        button.style.background = selectedTheme.accent;
      });
  
      // Save theme preference
      chrome.storage.sync.set({ theme });
    }
  }
  
  // Initialize when popup opens
  document.addEventListener('DOMContentLoaded', () => {
    const app = new SummarAI();
  }); 