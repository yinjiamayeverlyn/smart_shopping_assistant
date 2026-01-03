# Smart Shopping Assistant Mobile App

## Project Overview

The goal of this group project is to create a mobile application that will help people with vision impairments when they shop. In order to help users identify products, pricing, and cart information without depending on visual cues, the program uses real-time object identification to identify grocery and domestic items and offers audio feedback.

The system is implemented as a functional prototype and demonstrated using a local IP network, allowing mobile devices to connect to the application during testing and presentation. This approach enables real-time camera streaming, object detection, and interaction between the mobile interface and the backend server within a controlled environment.

The project emphasizes accessibility, simplicity of user interface, and assistive technology design, ensuring that visually impaired users can navigate the application easily and independently.

## How to Clone and Run the Project

### Step 1: Download the Project from Github

Clone the repository or download it as a Zip and extract it. 

### Step 2: Open the Project Using Visual Studio Code

Open Visual Studio Code (VS Code).

Click File > Open Folder.

Select the extracted project folder.

Make sure you can see the file app.py in the folder.

### Step 3: Open Terminal in VS Code

In VS Code, click Terminal > New Terminal.

The terminal will open at the bottom of VS Code.

Make sure the terminal path shows your project folder (for example: E:\smart_shopping_assistant).

### Step 4: Install Required Python Libraries

Before running the system, required libraries must be installed.

In the terminal, run the following command:

```bash
py -m pip install flask flask-socketio flask-babel gTTS opencv-python ultralytics numpy
```
Note:

- This step may take a few minutes.
- Make sure you have an internet connection.
- Wait until all packages finish installing.

### Step 5: Run the Application

After installation is completed, run:

```bash
py app.py
```

If successful, the terminal will show a message similar to:

```bash
Running on https://0.0.0.0:5000
```

Do not close the terminal because the server must stay running.

### Step 6: Find the Laptop IP Adress

Open another terminal (or Command Prompt) and run:

```bash
ipconfig
```

Look for IPv4 Address, for example:

```bash
192.168.1.100
```

### Step 7: Open the Application on Mobile Phone

Make sure your laptop and mobile phone are connected to the same Wi-Fi network.

Open a browser on the mobile phone (Chrome / Safari).

Enter the URL:

```bash
https://<Laptop_IP_Address>:5000
```

### Step 8: Security Warining (Normal)

Because this system uses a self-signed certificate:

A security warning will appear.

Tap Advanced.

Select Proceed anyway / Continue.

Note: This is normal and safe for local testing.

### Step 9: Start Scanning and Detection

The homepage will load on the phone.

Navigate to the Scan page.

Allow camera permission when prompted.

Point the camera at supported products.

The system will:

- Detect products using YOLO
- Display product information
- Allow adding items to the shopping cart

### Important Notes

The terminal must remain open while using the system.

Closing the terminal will stop the server.

Camera access requires HTTPS.

The system only works when both devices are on the same Wi-Fi network.
