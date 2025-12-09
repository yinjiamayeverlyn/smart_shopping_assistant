document.addEventListener('DOMContentLoaded', () => {
    const ttsButtons = document.querySelectorAll('.btn');
    const speech = window.speechSynthesis;
    let utterance = null;

    // Cache the audio files
    const audioCache = {};

    // Preload all audio files based on the buttons' data-text attributes
    ttsButtons.forEach(button => {
        const textToSpeak = button.getAttribute('data-text');
        if (textToSpeak) {
            // Fetch audio file
            const audioUrl = `/static/tts_output/${textToSpeak}.mp3`; 
            
            // Cache the audio by URL
            const audio = new Audio(audioUrl);
            audioCache[textToSpeak] = audio;
        }
    });

    // Play the audio for a given text
    function speakText(text) {
        if (speech.speaking) {
            speech.cancel();
        }
        if (audioCache[text]) {
            audioCache[text].play();
        } else {
            utterance = new SpeechSynthesisUtterance(text);
            speech.speak(utterance);
        }
    }

    // Stop speaking
    function stopSpeaking() {
        if (speech.speaking) {
            speech.cancel();
        }
    }

    // Event listeners for button hover
    ttsButtons.forEach(button => {
        const textToSpeak = button.getAttribute('data-text');
        button.addEventListener('mouseover', () => {
            if (textToSpeak) {
                speakText(textToSpeak);
            }
        });

        button.addEventListener('mouseout', () => {
            stopSpeaking();
        });
    });
});
