window.currentProduct = null;
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();

let stream = null;
let frameInterval = null;
let scanningActive = true;
let localCart = [];

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

   //aina tambah
  window.currentProduct = {
    name: product.name,
    price: parseFloat(product.price)
  };
  //aina tambah

   //aina tambah
  // Ensure product object has both name and price
  if (!product || !product.name || !product.price) {
    console.error("Invalid product data:", product);
    return;
  }
  //aina tambah

  $("#modalTitle").text(product.name);
  $("#modalPrice").text("Price: RM " + parseFloat(product.price.toFixed(2)));
  $("#modalQty").val(1); 

  $.get("/get_cart_total", function(data) {
      $("#modal-cart-total").text("RM " + data.total.toFixed(2));
  });

   const modal = new bootstrap.Modal(document.getElementById("productModal")
    );
  modal.show();

    const textToSpeak = `Product scanned: ${product.name}. Price: RM${parseFloat(product.price.toFixed(2))}.`;
    speakText(textToSpeak);

    //alert("Product " + product.name + " added and the Price:");

  //window.currentProduct = product;
}


$("#closeModal").click(function() {
   const modal = new bootstrap.Modal(
     document.getElementById("productModal")
    );
  modal.hide();
      resumeScanning();
  
});

$("#productModal").on("hidden.bs.modal", function () {
  //resumeScanning();
  console.log("Modal closed, resuming camera...");
    
    // Safety: ensure scanning turns back on
    resumeScanning();
    
    // Clear the quantity input for the next scan
    $("#modalQty").val(1);
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

// This handles the "Add to Cart" button inside your Modal
$("#addCart").click(function() {
  //alert("Step 1: Button Clicked!");

    if (!window.currentProduct){
      alert("Step 2: Error - No product detected yet!");
     return;
    }

    // Get the quantity from the input field
    const qty = parseInt($("#modalQty").val()) || 1;
    //alert("Step 3: Quantity is " + qty);

    // Prepare the data to send (including quantity)
    const dataToSend = {
        name: window.currentProduct.name,
        price: window.currentProduct.price,
        quantity: qty
    };

    //alert("Step 4: Sending to Python...");

    const unlock = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(unlock);

    // Send the data to your Python "Chef"
    $.post("/add_to_cart", dataToSend, function(data) {

      console.log("Python Response:", data);
      //alert("Step 5: Python Replied! Success: " + data.success);
      //alert("Debug: Total received is " + data.total);

        if (data.success == true) {
          
            // 1. Voice confirmation (optional, but cool!)
            //speakText(window.currentProduct.name + " added. Total RM " + data.total.toFixed(2));
            
            // 2. Alert as you requested
            //alert(dataToSend.name + " added to your JSON database!");

            // // 3. Update the total on the screen
            var formattedTotal = parseFloat(data.total).toFixed(2);

            speakText(dataToSend.name + " added. Your total is " + formattedTotal + " Ringgit");

            $("#modal-cart-total").text("RM " + formattedTotal);

            //alert("Success! New total from Python is: " + data.total);
            
            window.currentProduct = null;

            // 4. Reset the quantity to 1 for the next scan (as requested)
            $("#modalQty").val(1);

            console.log("Item added, but keeping modal open for the user.");
        } else {
          alert("Server error: Product could not be added")
        }
    }).fail(function(){
      alert("Step 5 Error: Could not reach Python server!");
    });
});

