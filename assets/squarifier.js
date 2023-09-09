/* TODO
* - move to background thread in web worker and post updates to fill a loading bar
* - bg color options (fill color for squared images)
* - size options (?) - can't upscale so probably not
* - test and enable the following image types: 
*   -- AVIF, TIFF, WEBP, SVG	
* - loading spinner until web-worker and progress bar/messaging
* - progress bar
* - fix height of output container to avoid scrollbar until necessary, dont auto-top margin on privacy trigger
* - check size of loaded files and show warning if it's going to take a while (i.e. more than 50-100mb)
* - favicon (white square, black border)
*/

function setupStartButton() {
	const button = document.getElementById("start-button")?.addEventListener("click", () => {
		processImages();
	})
}

function setupFileInputs() {
	const fileInput = document.getElementById("fileinput");
	const errorMessage = document.getElementById("error-toast");
	const allowedTypes = [
		"image/png",
		"image/jpeg",
		"image/bmp"
	]
	if (fileInput) {
		
		fileInput.addEventListener('change', (e) => {
			errorMessage.style.display = "none";
			
			for (let i = 0; i < fileInput.files.length; i++) {
				if (!allowedTypes.includes(fileInput.files[i].type)) {
						errorMessage.innerText = "Only PNG and JPG/JPEG are supported at this time"
						errorMessage.style.display = "block";
						return
				}
			}
			Array.from(fileInput.files).forEach(file => {
				
			})
			
			if (fileInput.files && fileInput.files.length > 0) {
				document.getElementById("start-button").style.display = "block"
				document.getElementById("image-count").innerText = `${fileInput.files.length} selected`
			}
			if (fileInput.files && fileInput.files.length > 1) {
				document.querySelectorAll(".multi-image-notice").forEach(el => {
					if (window.clientWidth > 767 && el.classList.contains("mobile-only")) { return; }
					el.style.display = "block";
				})
			}
		})
	}
}

function setupPrivacyAccordion() {
	const accordionTrigger = document.getElementById("privacy-trigger");
	const accordionContent = document.getElementById("privacy-content");
	const accordionCaret = document.getElementById("privacy-caret");
	if (!accordionTrigger || !accordionContent) { console.log("can't find privacy elements"); return; }
	
	accordionTrigger.addEventListener("click", () => {
		accordionContent.classList.toggle("accordion");
		if (accordionCaret) {
			accordionCaret.classList.toggle("up");
		}
	})
}

function processImages() {
	const fileInput = document.getElementById("fileinput");
	let imageBlobs = []
	
	Promise.all(
		Array.from(fileInput.files).map( async (file, i) => {
			const image = new Image()
			const reader = new FileReader()
			
			const syncPromise = new Promise( (resolve) => {
				image.onload = async () => {
					const canvas = new OffscreenCanvas(0,0)
					const ctx = canvas.getContext('2d');
					const size = Math.max(image.width, image.height);
					canvas.width = size;
					canvas.height = size;
					
					// set white bg
					ctx.fillStyle = 'white';
					ctx.fillRect(0,0,size,size);
					
					// find center image position
					const x = (size - image.width) / 2;
					const y = (size - image.height) / 2;
					
					// draw image on canvas
					ctx.drawImage(image, x, y);

					// output image file
					
					// probably need to get this as a blob or whatever instead
					//imageOutputs.push(canvas.toDataURL("image/png"));
					const blob = await canvas.convertToBlob({type: "image/png"})
					imageBlobs.push(blob)
					resolve();
				}
				reader.onload = function(e) {
					image.src = e.target.result
				}
				reader.readAsDataURL(file)
			})
			await syncPromise
		})
	).then( () => {
		// generate link name and filename
		const date = new Date()
		const time = `${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`
		const outputContainer = document.querySelector(".outputLinkContainer")
		const batch_count = Number(outputContainer.dataset.batchCount)
		const link_text = `#${batch_count} - ${imageBlobs.length} image${imageBlobs.length > 1 ? 's' : ''}`
		const filename = `squarifier_${date.getMonth()+1}-${date.getDate()}-${date.getFullYear() % 1000}-${time.replace(':','')}`
		
		// zip the blobs, only do this if more than 1 image
		if (imageBlobs.length > 1) {
			let zip = new JSZip()
			imageBlobs.forEach( (blob, i) => {
				zip.folder("squared_images").file(`image${i+1}.png`, blob)
			})
			
			// then finally convert zipped images into data url for download
			zip.generateAsync({type: "blob"})
			.then( blob => {
				const outputLink = document.getElementById("output-template").content.cloneNode(true).children[0]
				outputLink.download = `${filename}.zip`;
				outputLink.href = URL.createObjectURL(blob)
				outputLink.innerText = link_text
				// insertBefore appends if insertion reference (firstElementChild) is null
				outputContainer.insertBefore(outputLink, outputContainer.firstElementChild);
				outputLink.addEventListener("click", () => outputLink.style.backgroundColor = "grey")
			})
		} else {
			const outputLink = document.getElementById("output-template").content.cloneNode(true).children[0]
			outputLink.download = `${filename}.png`;
			outputLink.href = URL.createObjectURL(imageBlobs[0])
			outputLink.innerText = link_text
			// insertBefore appends if insertion reference (firstElementChild) is null
			outputContainer.insertBefore(outputLink, outputContainer.firstElementChild);
			outputLink.addEventListener("click", () => outputLink.style.backgroundColor = "grey")
		}
		const output = document.querySelector(".outputLinkContainer")
		output.dataset.batchCount = Number(output.dataset.batchCount) + 1
	})
}



setupPrivacyAccordion()
setupStartButton()
setupFileInputs()