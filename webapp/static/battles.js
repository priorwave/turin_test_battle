document.addEventListener('DOMContentLoaded', () => {
    const battlesListDiv = document.getElementById('battles-list');
    const participantLeaderboardDiv = document.getElementById('participant-leaderboard');
    const interrogatorLeaderboardDiv = document.getElementById('interrogator-leaderboard');
    const modal = document.getElementById('battle-modal');
    const modalClose = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalBattleInfo = document.getElementById('modal-battle-info');
    const modalConversation = document.getElementById('modal-conversation');
    const modalJudgment = document.getElementById('modal-judgment');

    // Load data on page load
    loadLeaderboard();
    loadBattles();

    // Modal close handlers
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    async function loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const data = await response.json();

            displayLeaderboard(participantLeaderboardDiv, data.participant_stats, 'participant');
            displayLeaderboard(interrogatorLeaderboardDiv, data.interrogator_stats, 'interrogator');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            participantLeaderboardDiv.innerHTML = '<div class="no-data">Failed to load leaderboard data.</div>';
            interrogatorLeaderboardDiv.innerHTML = '<div class="no-data">Failed to load leaderboard data.</div>';
        }
    }

    function displayLeaderboard(container, stats, type) {
        if (!stats || stats.length === 0) {
            container.innerHTML = '<div class="no-data">No data available yet. Play some battles to see the leaderboard!</div>';
            return;
        }

        const itemsHtml = stats.map((item, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            
            return `
                <div class="leaderboard-item">
                    <div style="display: flex; align-items: center;">
                        <span class="leaderboard-rank">${rankEmoji}</span>
                        <span class="leaderboard-model">${item[type + '_model']}</span>
                    </div>
                    <div class="leaderboard-stats">
                        <span>${type === 'participant' ? item.fooled_count : item.correct_count}/${item.total_games}</span>
                        <span class="leaderboard-success-rate">${item.success_rate}%</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = itemsHtml;
    }

    async function loadBattles() {
        try {
            const response = await fetch('/api/battles');
            const data = await response.json();

            displayBattles(data.battles);
        } catch (error) {
            console.error('Error loading battles:', error);
            battlesListDiv.innerHTML = '<div class="no-data">Failed to load battle data.</div>';
        }
    }

    function displayBattles(battles) {
        if (!battles || battles.length === 0) {
            battlesListDiv.innerHTML = '<div class="no-data">No battles yet. <a href="/" style="color: var(--accent-secondary);">Start your first battle!</a></div>';
            return;
        }

        const battlesHtml = battles.map(battle => {
            const date = new Date(battle.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const verdictClass = battle.verdict ? battle.verdict.toLowerCase() : 'unknown';
            const verdictText = battle.verdict || 'Unknown';
            
            // Create a preview of the judgment
            const judgmentPreview = battle.judgment && battle.judgment.length > 100 
                ? battle.judgment.substring(0, 100) + '...'
                : battle.judgment || 'No judgment available';

            return `
                <div class="battle-card" data-run-id="${battle.run_id}">
                    <div class="battle-header">
                        <div class="battle-models">
                            <span class="battle-model">🎭 ${battle.participant_model}</span>
                            <span class="battle-vs">vs</span>
                            <span class="battle-model">🕵️‍♂️ ${battle.interrogator_model}</span>
                        </div>
                        <span class="battle-verdict ${verdictClass}">${verdictText}</span>
                    </div>
                    <div class="battle-meta">
                        <span class="battle-date">${date}</span>
                        <span>Click to view full conversation</span>
                    </div>
                    <div class="battle-preview">${judgmentPreview}</div>
                </div>
            `;
        }).join('');

        battlesListDiv.innerHTML = battlesHtml;

        // Add click handlers for battle cards
        document.querySelectorAll('.battle-card').forEach(card => {
            card.addEventListener('click', () => {
                const runId = card.dataset.runId;
                showBattleDetails(runId);
            });
        });
    }

    async function showBattleDetails(runId) {
        try {
            modal.classList.remove('hidden');
            modalTitle.textContent = 'Loading battle details...';
            modalBattleInfo.innerHTML = '<div class="loading">Loading...</div>';
            modalConversation.innerHTML = '<div class="loading">Loading conversation...</div>';
            modalJudgment.innerHTML = '<div class="loading">Loading judgment...</div>';

            const response = await fetch(`/api/battle/${runId}`);
            const data = await response.json();

            if (data.error) {
                modalTitle.textContent = 'Error';
                modalBattleInfo.innerHTML = `<div class="no-data">${data.error}</div>`;
                modalConversation.innerHTML = '';
                modalJudgment.innerHTML = '';
                return;
            }

            const battle = data.battle;
            displayBattleDetails(battle);
        } catch (error) {
            console.error('Error loading battle details:', error);
            modalTitle.textContent = 'Error';
            modalBattleInfo.innerHTML = '<div class="no-data">Failed to load battle details.</div>';
            modalConversation.innerHTML = '';
            modalJudgment.innerHTML = '';
        }
    }

    function displayBattleDetails(battle) {
        const date = new Date(battle.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const verdictClass = battle.verdict ? battle.verdict.toLowerCase() : 'unknown';
        const verdictText = battle.verdict || 'Unknown';

        modalTitle.textContent = `Battle: 🎭 ${battle.participant_model} vs 🕵️‍♂️ ${battle.interrogator_model}`;

        // Battle info
        modalBattleInfo.innerHTML = `
            <div class="battle-info-grid">
                <div class="battle-info-item">
                    <span class="battle-info-label">🎭 Participant Model</span>
                    <span class="battle-info-value">${battle.participant_model}</span>
                </div>
                <div class="battle-info-item">
                    <span class="battle-info-label">🕵️‍♂️ Interrogator Model</span>
                    <span class="battle-info-value">${battle.interrogator_model}</span>
                </div>
                <div class="battle-info-item">
                    <span class="battle-info-label">Date</span>
                    <span class="battle-info-value">${date}</span>
                </div>
                <div class="battle-info-item">
                    <span class="battle-info-label">Verdict</span>
                    <span class="battle-info-value">
                        <span class="battle-verdict ${verdictClass}">${verdictText}</span>
                    </span>
                </div>
            </div>
        `;

        // Display conversation
        displayConversation(battle.conversation);

        // Display judgment
        modalJudgment.innerHTML = `
            <h4>🕵️‍♂️ Interrogator's Final Judgment</h4>
            <div class="judgment-text">${battle.judgment || 'No judgment available'}</div>
        `;
    }

    function displayConversation(conversationData) {
        try {
            let conversation;
            if (typeof conversationData === 'string') {
                conversation = JSON.parse(conversationData);
            } else {
                conversation = conversationData;
            }

            if (!conversation || !conversation.interrogator_transcript || !conversation.participant_transcript) {
                modalConversation.innerHTML = '<div class="no-data">Conversation data not available</div>';
                return;
            }

            const interrogatorMessages = conversation.interrogator_transcript;
            const participantMessages = conversation.participant_transcript;

            // Extract the actual conversation flow
            const conversationFlow = [];
            
            // The conversation alternates: question -> response -> question -> response...
            // In interrogator_transcript: assistant messages are questions (skip system prompt at index 0)
            // In participant_transcript: assistant messages are responses (skip system prompt at index 0)
            
            let questionIndex = 1; // Start from index 1 to skip system prompt
            let responseIndex = 2; // Start from index 2 to skip system prompt and first user message
            
            while (questionIndex < interrogatorMessages.length && responseIndex < participantMessages.length) {
                // Add interrogator question
                if (interrogatorMessages[questionIndex] && interrogatorMessages[questionIndex].role === 'assistant') {
                    conversationFlow.push({
                        role: 'interrogator',
                        content: interrogatorMessages[questionIndex].content
                    });
                }
                
                // Add participant response  
                if (participantMessages[responseIndex] && participantMessages[responseIndex].role === 'assistant') {
                    conversationFlow.push({
                        role: 'participant',
                        content: participantMessages[responseIndex].content
                    });
                }
                
                questionIndex += 2; // Skip user message, get next assistant message
                responseIndex += 2; // Skip user message, get next assistant message
            }

            if (conversationFlow.length === 0) {
                modalConversation.innerHTML = '<div class="no-data">No conversation messages found</div>';
                return;
            }

            const conversationHtml = conversationFlow.map((msg) => {
                const messageClass = msg.role === 'interrogator' ? 'interrogator' : 'participant';
                const roleLabel = msg.role === 'interrogator' ? '🕵️‍♂️ Interrogator' : '🎭 Participant';
                
                return `
                    <div class="message ${messageClass}">
                        <strong>${roleLabel}:</strong> ${msg.content}
                    </div>
                `;
            }).join('');

            modalConversation.innerHTML = `
                <div class="conversation">
                    ${conversationHtml}
                </div>
            `;

            // Scroll to top of conversation
            const conversationElement = modalConversation.querySelector('.conversation');
            if (conversationElement) {
                conversationElement.scrollTop = 0;
            }
        } catch (error) {
            console.error('Error parsing conversation:', error);
            modalConversation.innerHTML = '<div class="no-data">Error parsing conversation data</div>';
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
    }
});