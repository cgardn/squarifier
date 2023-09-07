/* TODO
* - move to background thread in web worker and post updates to fill a loading bar
* - make it look nicer
* - make links into a button style (background, border, inverting shadow for click effect)
* - make little table of results as you do more, possible save in 
* - put on cloudflare or someplace free
* - donate link
*/

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

function handleFileInputs() {
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
		// zip the blobs
		let zip = new JSZip()
		imageBlobs.forEach( (blob, i) => {
			zip.folder("squared_images").file(`image${i+1}.png`, blob)
		})
		
		// then finally convert zipped images into data url for download
		zip.generateAsync({type: "blob"})
		.then( blob => {
			const outputLink = document.getElementById("output-template").content.cloneNode(true).children[0]
			outputLink.download = 'squared_images.zip';
			outputLink.href = URL.createObjectURL(blob)
			outputLink.innerText = "Your images are ready!"
			document.querySelector(".outputLinkContainer")?.appendChild(outputLink);
		})
	})
}


const fileInput = document.getElementById("fileinput");
if (fileInput) {
	fileInput.addEventListener('change', (e) => {
		const linkOutput = document.getElementById("linkoutput");
		handleFileInputs();
	})
}

setupPrivacyAccordion()