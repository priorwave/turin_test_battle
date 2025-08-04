document.addEventListener('DOMContentLoaded', () => {
    const participantModelSelect = document.getElementById('participant-model');
    const interrogatorModelSelect = document.getElementById('interrogator-model');
    const numQuestionsInput = document.getElementById('num-questions');
    const startGameBtn = document.getElementById('start-game');
    const gameArea = document.getElementById('game-area');
    const conversationDiv = document.getElementById('conversation');
    const judgmentArea = document.getElementById('judgment-area');
    const canvas = document.getElementById('celebration-canvas');
    const confetti = window.confetti.create(canvas, {
        resize: true,
        useWorker: true,
    });
    const apiKeyBanner = document.getElementById('api-key-banner');
    let resetGameBtn;
    let allModels = [];
    let eventSource = null;

    // Searchable Select functionality
    class SearchableSelect {
        constructor(inputElement, dropdownElement) {
            this.input = inputElement;
            this.dropdown = dropdownElement;
            this.wrapper = inputElement.parentElement;
            this.options = [];
            this.filteredOptions = [];
            this.selectedValue = '';
            this.selectedIndex = -1;
            this.isOpen = false;
            
            this.bindEvents();
        }
        
        bindEvents() {
            // Click to open/close dropdown
            this.input.addEventListener('click', () => {
                if (this.isOpen) {
                    this.close();
                } else {
                    this.open();
                }
            });
            
            // Input events for searching
            this.input.addEventListener('input', (e) => {
                this.filter(e.target.value);
                if (!this.isOpen) {
                    this.open();
                }
            });
            
            // Focus events
            this.input.addEventListener('focus', () => {
                this.input.removeAttribute('readonly');
            });
            
            this.input.addEventListener('blur', (e) => {
                // Small delay to allow option clicks to register
                setTimeout(() => {
                    if (!this.dropdown.contains(document.activeElement)) {
                        this.close();
                        this.input.setAttribute('readonly', 'true');
                        // Restore selected text if no valid selection
                        if (!this.selectedValue) {
                            this.input.value = '';
                        } else {
                            const selectedOption = this.options.find(opt => opt.value === this.selectedValue);
                            this.input.value = selectedOption ? selectedOption.text : '';
                        }
                    }
                }, 150);
            });
            
            // Keyboard navigation
            this.input.addEventListener('keydown', (e) => {
                if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                    e.preventDefault();
                    this.open();
                    return;
                }
                
                if (this.isOpen) {
                    switch (e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            this.navigateOptions(1);
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            this.navigateOptions(-1);
                            break;
                        case 'Enter':
                            e.preventDefault();
                            if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredOptions.length) {
                                this.selectOption(this.filteredOptions[this.selectedIndex]);
                            }
                            break;
                        case 'Escape':
                            e.preventDefault();
                            this.close();
                            break;
                    }
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.wrapper.contains(e.target)) {
                    this.close();
                }
            });
        }
        
        setOptions(options) {
            this.options = options;
            this.filteredOptions = [...options];
            this.render();
        }
        
        filter(searchTerm) {
            const term = searchTerm.toLowerCase();
            this.filteredOptions = this.options.filter(option => 
                option.text.toLowerCase().includes(term)
            );
            this.selectedIndex = -1;
            this.render();
        }
        
        render() {
            this.dropdown.innerHTML = '';
            
            if (this.filteredOptions.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.textContent = 'No models found';
                this.dropdown.appendChild(noResults);
                return;
            }
            
            this.filteredOptions.forEach((option, index) => {
                const optionEl = document.createElement('div');
                optionEl.className = 'dropdown-option';
                optionEl.textContent = option.text;
                optionEl.dataset.value = option.value;
                
                if (option.value === this.selectedValue) {
                    optionEl.classList.add('selected');
                }
                
                if (index === this.selectedIndex) {
                    optionEl.classList.add('highlighted');
                }
                
                optionEl.addEventListener('click', () => {
                    this.selectOption(option);
                });
                
                this.dropdown.appendChild(optionEl);
            });
        }
        
        navigateOptions(direction) {
            this.selectedIndex += direction;
            
            if (this.selectedIndex < 0) {
                this.selectedIndex = this.filteredOptions.length - 1;
            } else if (this.selectedIndex >= this.filteredOptions.length) {
                this.selectedIndex = 0;
            }
            
            this.render();
            
            // Scroll highlighted option into view
            const highlighted = this.dropdown.querySelector('.highlighted');
            if (highlighted) {
                highlighted.scrollIntoView({ block: 'nearest' });
            }
        }
        
        selectOption(option) {
            this.selectedValue = option.value;
            this.input.value = option.text;
            this.close();
            
            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            this.input.dispatchEvent(changeEvent);
        }
        
        open() {
            this.isOpen = true;
            this.wrapper.classList.add('open');
            this.dropdown.classList.add('open');
            this.input.classList.add('open');
            this.selectedIndex = -1;
            this.render();
        }
        
        close() {
            this.isOpen = false;
            this.wrapper.classList.remove('open');
            this.dropdown.classList.remove('open');
            this.input.classList.remove('open');
        }
        
        getValue() {
            return this.selectedValue;
        }
        
        setValue(value) {
            const option = this.options.find(opt => opt.value === value);
            if (option) {
                this.selectOption(option);
            }
        }
    }
    
    // Initialize searchable selects
    const participantSelect = new SearchableSelect(
        participantModelSelect,
        document.getElementById('participant-model-dropdown')
    );
    
    const interrogatorSelect = new SearchableSelect(
        interrogatorModelSelect,
        document.getElementById('interrogator-model-dropdown')
    );

    // Check for API Key
    fetch('/api/check_api_key')
        .then(response => response.json())
        .then(data => {
            if (!data.api_key_set) {
                apiKeyBanner.classList.remove('hidden');
                startGameBtn.disabled = true;
            }
        })
        .catch(error => {
            console.error('Error checking API key:', error);
        });

    // Fetch models and populate dropdowns
    fetch('/api/models')
        .then(response => response.json())
        .then(data => {
            allModels = data.models;
            
            // Sort models alphabetically
            allModels.sort((a, b) => a.name.localeCompare(b.name));
            
            // Prepare options for searchable selects
            const modelOptions = allModels.map(model => ({
                text: model.name,
                value: model.id
            }));
            
            // Set options for both dropdowns
            participantSelect.setOptions(modelOptions);
            interrogatorSelect.setOptions(modelOptions);
            
            // Clear inputs and set placeholders
            participantModelSelect.value = '';
            interrogatorModelSelect.value = '';
            participantModelSelect.setAttribute('placeholder', 'Search or select a model...');
            interrogatorModelSelect.setAttribute('placeholder', 'Search or select a model...');
        })
        .catch(error => {
            console.error('Error fetching models:', error);
            participantModelSelect.value = 'Error loading models';
            interrogatorModelSelect.value = 'Error loading models';
        });

    function createResetButton() {
        if (resetGameBtn) {
            resetGameBtn.remove();
        }
        resetGameBtn = document.createElement('button');
        resetGameBtn.id = 'reset-game';
        resetGameBtn.className = 'btn btn-secondary';
        resetGameBtn.textContent = 'Reset Game';
        resetGameBtn.addEventListener('click', () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            gameArea.classList.add('hidden');
            conversationDiv.innerHTML = '';
            judgmentArea.innerHTML = '';
            if(resetGameBtn) resetGameBtn.remove();
            startGameBtn.disabled = false;
            turnCounter = 0;
            startGameBtn.textContent = 'Start Game';
        });
        startGameBtn.parentNode.appendChild(resetGameBtn);
    }

    startGameBtn.addEventListener('click', () => {
        const participantModel = participantSelect.getValue();
        const interrogatorModel = interrogatorSelect.getValue();
        const numQuestions = numQuestionsInput.value;

        if (!participantModel || !interrogatorModel) {
            showUserError('Please select both a participant model and an interrogator model before starting the game.');
            return;
        }

        if (!participantModel.includes('/') || !interrogatorModel.includes('/')) {
            showUserError('Invalid model selection. Please refresh the page and try again.');
            return;
        }

        startGame(participantModel, interrogatorModel, numQuestions);
    });

    function startGame(participantModel, interrogatorModel, numQuestions) {
        startGameBtn.disabled = true;
        createResetButton();
        startGameBtn.textContent = 'Playing...';
        gameArea.classList.remove('hidden');
        conversationDiv.innerHTML = '<div class="loading-message">🤖 The game is starting...<br>The interrogator is thinking of the first question.</div>';
        judgmentArea.innerHTML = '';

        eventSource = new EventSource(`/api/play?participant_model=${participantModel}&interrogator_model=${interrogatorModel}&num_questions=${numQuestions}`);

        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);

            if (data.error) {
                conversationDiv.innerHTML = `<div class="error-message">❌ ${data.error}<br><small>Try selecting different models or check your API key configuration.</small></div>`;
                eventSource.close();
                eventSource = null;
                startGameBtn.disabled = false;
                startGameBtn.textContent = 'Start Game';
                return;
            }

            if (data.role === 'judgment') {
                displayJudgment(data.content);
                eventSource.close();
                eventSource = null;
                startGameBtn.disabled = false;
                startGameBtn.textContent = 'Start Game';
            } else {
                updateConversation(data);
            }
        };

        eventSource.onerror = function() {
            conversationDiv.innerHTML += `<div class="error-message">🔌 Connection error occurred.<br><small>Please check your internet connection and try again.</small></div>`;
            eventSource.close();
            eventSource = null;
            startGameBtn.disabled = false;
            startGameBtn.textContent = 'Start Game';
        };
    }

    let turnCounter = 0;
    function updateConversation(msg) {
        // Remove loading message if present
        const loadingMessage = conversationDiv.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        if (msg.role === 'interrogator') {
            turnCounter++;
            const turnEl = document.createElement('div');
            turnEl.classList.add('turn-separator');
            turnEl.textContent = `Question ${turnCounter}`;
            conversationDiv.appendChild(turnEl);
        }

        const messageEl = document.createElement('div');
        const roleClass = msg.role === 'human' ? 'participant' : msg.role;
        messageEl.classList.add('message', roleClass);
        messageEl.textContent = msg.content;
        conversationDiv.appendChild(messageEl);
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
    }

    function displayJudgment(judgment) {
        judgmentArea.innerHTML = `<h3>Final Judgment</h3><p>${judgment}</p>`;
        if (judgment.toLowerCase().includes('final verdict: ai')) {
            triggerCelebration();
        }
    }

    function triggerCelebration() {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        
        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                particleCount: Math.floor(particleCount),
                startVelocity: 30,
                spread: 360,
                origin: {
                    x: randomInRange(0.1, 0.9),
                    y: Math.random() - 0.2
                }
            });
        }, 250);
    }

    // Helper function for user-friendly error messages
    function showUserError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'user-error-message';
        errorDiv.innerHTML = `❌ ${message}`;
        
        // Show error in game area or create temporary banner
        if (gameArea.classList.contains('hidden')) {
            errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; max-width: 90vw;';
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        } else {
            conversationDiv.innerHTML = errorDiv.outerHTML;
        }
    }

    // Add loading states and better error handling
    const style = document.createElement('style');
    style.textContent = `
        .loading-message {
            text-align: center;
            color: var(--text-secondary);
            font-style: italic;
            padding: 20px;
            background: var(--bg-tertiary);
            border-radius: var(--border-radius-sm);
            border: 1px solid var(--border-muted);
        }
        
        .error-message, .user-error-message {
            background: linear-gradient(135deg, var(--accent-danger), #e74c3c);
            color: white;
            padding: 16px 20px;
            border-radius: var(--border-radius-sm);
            margin: 8px 0;
            text-align: center;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(231, 76, 60, 0.3);
        }
        
        .error-message small, .user-error-message small {
            opacity: 0.9;
            font-weight: 400;
            display: block;
            margin-top: 8px;
        }
    `;
    document.head.appendChild(style);
});