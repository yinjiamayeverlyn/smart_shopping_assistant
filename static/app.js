const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const socket = io("http://localhost:5000");

// Request camera access
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert("Camera access denied. Please allow camera access.");
  });

// Resize canvas once video is ready
video.onloadedmetadata = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// Send frames periodically
setInterval(() => {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL("image/jpeg");
  const base64 = dataURL.split(",")[1];
  socket.emit("video_frame", { image: base64 });
}, 150); // 150ms delay per frame

// Receive detections
socket.on("detections", detections => {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // redraw video frame

  detections.forEach(det => {
    // Draw bounding box
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      det.bbox[0], // x1
      det.bbox[1], // y1
      det.bbox[2] - det.bbox[0], // width (x2 - x1)
      det.bbox[3] - det.bbox[1] // height (y2 - y1)
    );

    ctx.fillStyle = "black";
    ctx.fillText(
      det.bbox[0], 
      det.bbox[1] - 5 
    );
  });

  // If an product is detected, show modal
  if (detections.length > 0) {
    const firstDetection = detections[0];
    showProductModal(firstDetection);
  }
});

function showProductModal(product) {
  $("#modalTitle").text(product.name);
  $("#modalPrice").text("Price: RM" + product.price.toFixed(2));
  $("#modalQty").val(1); 
  $("#productModal").modal("show");

  window.currentProduct = product;
}

$("#addCart").click(function() {
  if (window.currentProduct) {
    const qty = parseInt($("#modalQty").val());
    $.post("/add_to_Cart", { quantity: qty }, function() {
      $("#productModal").modal("hide");
    });
  }
});

$("#closeModal").click(function() {
  $.post("/cancel_detected", {}, function() {
    $("#productModal").modal("hide");
  });
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

function navigate(path) {
  if (window.location.pathname === "/scan") {
    stopScanning(); 
  }

  requestAnimationFrame(() => {
    history.pushState({}, "", path);
    renderRoute(path);
  });
}


document.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href.startsWith("/")) return;

   e.preventDefault(); 

  if (window.location.pathname === "/scan") {
    stopScanning();
  }
});


window.addEventListener("beforeunload", stopScanning);
window.addEventListener("pagehide", stopScanning);