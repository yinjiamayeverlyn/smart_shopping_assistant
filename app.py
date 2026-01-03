from flask import Flask, render_template, request, Response, send_file, send_from_directory, jsonify, request, session, redirect, url_for
import cv2
import os
from gtts import gTTS
from ultralytics import YOLO
import threading
from flask_socketio import SocketIO, emit, disconnect
import base64
import numpy as np
import json
#from flask import Flask, session, request, redirect, url_for, g
from flask_babel import Babel, gettext as _

app = Flask(__name__)
app.secret_key = "supersecretkey"

JSON_FILE = 'test_cart.json'

def load_from_json():
    # If the file doesn't exist, return an empty list
    if not os.path.exists(JSON_FILE):
        return []
    with open(JSON_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_to_json(cart_data):
    with open(JSON_FILE, 'w') as f:
        json.dump(cart_data, f, indent=4)

app.config.update(
    SESSION_COOKIE_SECURE=True,   # Required because you are using HTTPS
    SESSION_COOKIE_HTTPONLY=True, # Prevents JS from messing with the cookie
    SESSION_COOKIE_SAMESITE='Lax', # Allows the cookie to persist across redirects
)

app.config['LANGUAGES'] = ['en', 'my', 'zh']

babel = Babel(app)

def get_locale():
    # determines the best match for the user's language
    return request.accept_languages.best_match(app.config['LANGUAGES'])

socketio = SocketIO(app, cors_allowed_origins="*")

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
    cart_items = load_from_json()
    
    total = sum(item.get('price', 0) * item.get('quantity', 1) for item in cart_items)
    
    return render_template('cart.html', cart=cart_items, total=total)
# def cart():
#     cart_products = session.get('cart', [])
#     total_price = sum(product['price']*product['quantity'] for product in cart_products)
#     return render_template("cart.html", cart=cart_products, total=total_price)

def your_tts_function(text):
    # Create a filename based on the text (hashed or cleaned)
    # We use a simple hash or timestamp to keep it unique
    import hashlib
    clean_text = text.replace(" ", "_").replace(":", "").replace(".", "")
    filename = f"dynamic_{clean_text}.mp3"
    filepath = os.path.join(TTS_DIRECTORY, filename)
    
    # If we haven't generated this specific sentence yet, create it
    if not os.path.exists(filepath):
        tts = gTTS(text=text, lang='en')
        tts.save(filepath)
    
    return filename

@app.route('/tts')
def tts_api():
    text = request.args.get('text')
    # Use your existing function to convert text to mp3
    filename = your_tts_function(text) 
    return jsonify({"filename": filename})

@app.route('/get_cart_total')
def get_cart_total():
    cart_items = load_from_json()

    total_price = sum(item['price'] * item['quantity'] for item in cart_items)
    return jsonify({'total': total_price})

@app.route('/clear_cart', methods=['POST'])
def clear_cart():
    try:
        # This overwrites the file with an empty list
        with open('test_cart.json', 'w') as f:
            json.dump([], f)
        return {"success": True}, 200
    except Exception as e:
        print(f"Error: {e}")
        return {"success": False}, 500

TTS_DIRECTORY = 'static/tts_output'
os.makedirs(TTS_DIRECTORY, exist_ok=True)

BUTTON_TEXTS = ['Start scan', 'View cart', 'Finish']  

def generate_tts_audio_files():
    for text in BUTTON_TEXTS:
        filename = os.path.join(TTS_DIRECTORY, f"{text}.mp3")
        if not os.path.exists(filename):  
            tts = gTTS(text)
            tts.save(filename)
    
    for product in PRODUCTS:
        name = product.get("name")
        filename = os.path.join(TTS_DIRECTORY, f"{name}.mp3")
        if not os.path.exists(filename):  
            tts = gTTS(name)
            tts.save(filename)

    filename = os.path.join(TTS_DIRECTORY, f"Your cart is empty.mp3")
    if not os.path.exists(filename):  
        tts = gTTS("Your cart is empty")
        tts.save(filename)


generate_tts_audio_files()

@app.route('/static/tts_output/<filename>')
def serve_audio(filename):
    return send_from_directory(TTS_DIRECTORY, filename)


@socketio.on('video_frame')
def handle_frame(data):

    global detected_product

    if not data or 'image' not in data:
        return

    # Decode base64 image
    img_bytes = base64.b64decode(data['image'])
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    detections = []

    results = model.predict(frame, imgsz=640, conf=0.3)
    for res in results:
        for box in res.boxes:
            conf = float(box.conf[0])
            if conf < 0.5:
                continue

            cls_idx = int(box.cls[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            detections.append({
                "id": PRODUCTS[cls_idx]["id"],
                "name": PRODUCTS[cls_idx]["name"],
                "price": PRODUCTS[cls_idx]["price"],
                "conf": conf,
                "bbox": [x1, y1, x2, y2]
            })

    emit('detections', detections)


@socketio.on('stop_scan')
def handle_stop_scan():
    print(f"Client requested stop: {request.sid}")


@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


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
    name = request.form.get('name')
    price = float(request.form.get('price'))
    quantity_to_add = int(request.form.get('quantity', 1))
    
    # 1. Load the existing cart
    cart = load_from_json()
    
    # 2. Check if the item already exists in the cart
    item_found = False
    for item in cart:
        if item['name'] == name:
            # Item exists! Just add the new quantity to the existing quantity
            item['quantity'] += quantity_to_add
            item_found = True
            break
            
    if not item_found:
        # 3. New item? Add it as a new dictionary entry
        cart.append({
            'name': name, 
            'price': price, 
            'quantity': quantity_to_add
        })
    
    # 4. Save it back to JSON
    save_to_json(cart)
    
    # 5. Calculate total (Same logic as before)
    total = sum(item['price'] * item.get('quantity', 1) for item in cart)
    
    print(f"Updated Cart: {name} now has quantity {next((i['quantity'] for i in cart if i['name'] == name), 0)}")
    
    return jsonify({'success': True, 'total': total})


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
   #-- app.run(debug=True) --#
   #  app.run(debug=True, host='0.0.0.0', port=5000, )  
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, ssl_context=('cert.pem', 'key.pem'))

