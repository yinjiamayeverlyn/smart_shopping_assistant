const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const socket = io();


let stream = null;
let frameInterval = null;
let scanningActive = true;

// Request camera access
navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } })
.then(s => {
  stream = s;
  video.srcObject = stream;
  startScanning();
})
.catch(err => {
  alert("Error accessing camera: " + err.message);
});

// Resize canvas once video is ready
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

//Start scanning
function startScanning() {
  if (frameInterval) return;

  scanningActive = true;

  frameInterval = setInterval(() => {
    if (!scanningActive) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/jpeg");
    const base64 = dataURL.split(",")[1];

    socket.emit("video_frame", { image: base64 });
  }, 150);
}

//Pause when product is detected
function pauseScanning() {
  scanningActive = false;

  if (frameInterval) {
    clearInterval(frameInterval);
    frameInterval = null;
  }

  video.pause();
}

//Resume
function resumeScanning() {
  if (!stream) return;

  video.play();
  startScanning();
}


// Send frames periodically
setInterval(() => {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL("image/jpeg");
  const base64 = dataURL.split(",")[1];
  socket.emit("video_frame", { image: base64 });
}, 500); 

// Receive detections
socket.on("detections", detections => {
  if (!scanningActive) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  detections.forEach(det => {
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      det.bbox[0],
      det.bbox[1],
      det.bbox[2] - det.bbox[0],
      det.bbox[3] - det.bbox[1]
    );
  });

  if (detections.length > 0) {
    pauseScanning();
    showProductModal(detections[0]);
  }
});


function showProductModal(product) {
  $("#modalTitle").text(product.name);
  $("#modalPrice").text("Price: RM" + parseFloat(product.price.toFixed(2)));
  $("#modalQty").val(1); 
   const modal = new bootstrap.Modal(
     document.getElementById("productModal")
    );
  modal.show();

    const textToSpeak = `Product scanned: ${product.name}. Price: ${productPrice.toFixed(2)}.`;
    speakText(textToSpeak);

  window.currentProduct = product;
}

$("#addCart").click(function() {
  if (window.currentProduct) {
    const qty = parseInt($("modalQty").val());
    $.post("/add_to_Cart", { quantity: qty }, function() {

         const modal = new bootstrap.Modal(
     document.getElementById("productModal")
    );
  modal.hide();

      resumeScanning();
    });
  } else {
  }
});

$("#closeModal").click(function() {
   const modal = new bootstrap.Modal(
     document.getElementById("productModal")
    );
  modal.hide();
      resumeScanning();
  
});

$("#productModal").on("hidden.bs.modal", function () {
  resumeScanning();
});

// Stop scanning and release resources
function stopScanning() {
  if (frameInterval) {
    clearInterval(frameInterval);
    frameInterval = null;
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  if (socket && socket.connected) {
    socket.emit("stop_scan");
    socket.disconnect();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

