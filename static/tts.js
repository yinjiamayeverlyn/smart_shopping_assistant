// document.addEventListener('DOMContentLoaded', () => {
//     const ttsButtons = document.querySelectorAll('.btn');
//     const speech = window.speechSynthesis;
//     let utterance = null;

//     // Cache the audio files for the buttons
//     const audioCache = {};

//     // Preload all audio files based on the buttons' data-text attributes
//     ttsButtons.forEach(button => {
//         const textToSpeak = button.getAttribute('data-text');
//         if (textToSpeak) {
//             const audioUrl = `/static/tts_output/${textToSpeak}.mp3`; 
//             const audio = new Audio(audioUrl);
//             audioCache[textToSpeak] = audio;
//         }
//     });

//     // Function to play the audio for a given text
//     function speakText(text) {
//         if (speech.speaking) {
//             speech.cancel();
//         }
//         if (audioCache[text]) {
//             audioCache[text].play();
//         } else {
//             utterance = new SpeechSynthesisUtterance(text);
//             speech.speak(utterance);
//         }
//     }

//     // Stop speaking
//     function stopSpeaking() {
//         if (speech.speaking) {
//             speech.cancel();
//         }
//     }

//     // Event listeners for button hover
//     function bindButtonEvents() {
//         document.querySelectorAll('.btn').forEach(button => {
//             const textToSpeak = button.getAttribute('data-text');

//             // button.addEventListener('mouseover', () => {
//             //     if (textToSpeak) {
//             //         speakText(textToSpeak);
//             //     }
//             // });

//             // button.addEventListener('mouseout', () => {
//             //     stopSpeaking();
//             // });

//             button.addEventListener('click', () => {
//             if (textToSpeak) speakText(textToSpeak);
//         });

//         button.addEventListener('touchstart', () => {
//             if (textToSpeak) speakText(textToSpeak);
//         });
        
//         });
//     }

//     bindButtonEvents();

//     const observer = new MutationObserver(bindButtonEvents);
//     observer.observe(document.body, { childList: true, subtree: true });

//     // Announce the scanned product (name and price)
//     function handleProductScan(productName, productPrice) {
//         const textToSpeak = `Product scanned: ${productName}. Price: $${productPrice.toFixed(2)}.`;
//         speakText(textToSpeak);
//     }

//     const cartTotalElement = document.querySelector('.cart-total');
//     if (cartTotalElement) {
//         const cartTotal = parseFloat(cartTotalElement.getAttribute('data-total'));
        
//         if (cartTotal > 0) {
//             // Announce the total cart price
//             const totalText = `Total cart price: RM${cartTotal.toFixed(2)}.`;
//             speakText(totalText);
//         }
//     }

// });
// ==============================
// GLOBAL (must be outside DOMContentLoaded)
// ==============================
const speech = window.speechSynthesis;
const audioCache = {};

// ✅ MUST be global so app.js can call it
window.speakText = function (text) {
    if (!text) return;

    if (speech.speaking) {
        speech.cancel();
    }

    if (audioCache[text]) {
        audioCache[text].currentTime = 0;
        audioCache[text].play();
    } else {
        const utterance = new SpeechSynthesisUtterance(text);
        speech.speak(utterance);
    }
};

window.stopSpeaking = function () {
    if (speech.speaking) {
        speech.cancel();
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // Preload audio for buttons
    document.querySelectorAll('.btn').forEach(button => {
        const textToSpeak = button.getAttribute('data-text');
        if (textToSpeak && !audioCache[textToSpeak]) {
            audioCache[textToSpeak] = new Audio(
                `/static/tts_output/${textToSpeak}.mp3`
            );
        }
    });

    function bindButtonEvents() {
        document.querySelectorAll('.btn').forEach(button => {
            const textToSpeak = button.getAttribute('data-text');
            if (!textToSpeak) return;

            // 🚫 Prevent duplicate listeners
            button.ontouchstart = null;

            const href = button.getAttribute('href'); // for links

            // Mobile (touch)
            button.addEventListener('touchstart', (e) => {
                 if (href) e.preventDefault(); // stop immediate navigation

                speakText(textToSpeak);

        // Delay navigation until speech ends or fixed time (e.g., 500ms)
        if (href) {
            setTimeout(() => {
            window.location.href = href;
        }, 500); 
        }
           
            });
       
        });
    }

    bindButtonEvents();

    // Observe dynamically added buttons (modal, cart, etc.)
    const observer = new MutationObserver(bindButtonEvents);
    observer.observe(document.body, { childList: true, subtree: true });

    // Cart total announcement (optional)
    const cartTotalElement = document.querySelector('.cart-total');
    if (cartTotalElement) {
        const cartTotal = parseFloat(cartTotalElement.dataset.total);
        if (cartTotal > 0) {
            speakText(`Total cart price: RM${cartTotal.toFixed(2)}`);
        }
    }
});

