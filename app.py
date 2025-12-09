from flask import Flask, render_template, Response, send_file, send_from_directory, jsonify, request, session, redirect, url_for
import cv2
import os
from gtts import gTTS
from ultralytics import YOLO
import threading

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Load YOLO model
MODEL_PATH = "best.pt"
model = YOLO(MODEL_PATH)
model.conf = 0.3
model.iou = 0.45

# Products
PRODUCTS = [
    {"id":0,"name": "Boh Tea", "price": 3.20},
    {"id":1,"name": "Buruh Cooking Oil", "price": 9.50},
    {"id":2,"name": "Cocorex Bleach", "price": 11.50},
    {"id":3,"name": "Febreze", "price": 11.20},
    {"id":4,"name": "Maggi Mee", "price": 4.80},
    {"id":5,"name": "Milo", "price": 14.50},
    {"id":6,"name": "Munchy's Topmix", "price": 13.90},
    {"id":7,"name": "Nestum Original", "price": 4.70},
    {"id":8,"name": "Sunlight Dishwashing Liquid", "price": 9.90},
    {"id":9,"name": "Twisties", "price": 2.20},
]

# Thread-safe global for detected product
detected_product = None
lock = threading.Lock()

# ---- Routes ----
@app.route('/')
def index():
    return render_template("index.html")

@app.route('/scan')
def scan():
    return render_template("scan.html")

@app.route('/cart')
def cart():
    cart_items = session.get('cart', [])
    total_price = sum(item['price']*item['quantity'] for item in cart_items)
    return render_template("cart.html", cart=cart_items, total=total_price)



TTS_DIRECTORY = 'static/tts_output'
os.makedirs(TTS_DIRECTORY, exist_ok=True)

BUTTON_TEXTS = ['Start scan', 'View cart', 'Finish']  

def generate_tts_audio_files():
    for text in BUTTON_TEXTS:
        filename = os.path.join(TTS_DIRECTORY, f"{text}.mp3")
        if not os.path.exists(filename):  
            tts = gTTS(text)
            tts.save(filename)

generate_tts_audio_files()

@app.route('/static/tts_output/<filename>')
def serve_audio(filename):
    return send_from_directory(TTS_DIRECTORY, filename)



# ---- Video Feed ----
def gen_frames():
    global detected_product
    cap = cv2.VideoCapture(0)
    while True:
        success, frame = cap.read()
        if not success:
            break

        results = model.predict(frame, imgsz=640, conf=0.3)
        for res in results:
            for box in res.boxes:
                cls_idx = int(box.cls[0])
                conf = float(box.conf[0])
                if conf > 0.5:
                    with lock:
                        detected_product = PRODUCTS[cls_idx]

                    # Draw bounding box
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0,165,255), 2)
                    cv2.putText(frame, f"{PRODUCTS[cls_idx]['name']} {conf:.2f}",
                                (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,0), 2)

        # Encode frame for MJPEG stream
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# ---- API Endpoints ----
@app.route('/get_detected')
def get_detected():
    global detected_product
    with lock:
        prod = detected_product
    if prod:
        return {"id": prod['id'], "name": prod['name'], "price": prod['price']}
    return {}

@app.route('/add_to_cart', methods=['POST'])
def add_to_cart():
    global detected_product
    quantity = int(request.form.get('quantity', 1))
    if 'cart' not in session:
        session['cart'] = []
    prod = detected_product.copy()
    prod['quantity'] = quantity
    session['cart'].append(prod)
    detected_product = None
    session.modified = True
    return {'status':'ok'}

@app.route('/cancel_detected', methods=['POST'])
def cancel_detected():
    global detected_product
    detected_product = None
    return {'status':'ok'}

@app.route('/finish_cart', methods=['POST'])
def finish_cart():
    session['cart'] = []
    session.modified = True
    return redirect(url_for('index'))

# ---- Run App ----
if __name__ == "__main__":
    app.run(debug=True)
