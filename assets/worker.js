self.onmessage = (e) => {
	if (e.data.message === 'initialize') {
		self.id = e.data.id
		self.files = e.data.files // already an Array, NOT a FileList (object)
		
		// modified version: replace references to "window" with "self"
		self.importScripts('/assets/jszip.min.js')
		processImages()
		
	}
}

// instead of the promise thing, the filelist is an array of blobs so synchroniously call createImageBitmap(blob)
// -- then pass the returned ImageBitmap to the context and proceed, as the context can drawImage() with an ImageBitmap
function processImages() {
	let imageBlobs = []
	try {
		Promise.all(
			self.files.map( async (file, i) => {
				const syncPromise = new Promise( async (resolve) => {
					const image = await createImageBitmap(file)
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
					const blob = await canvas.convertToBlob({type: "image/png"})
					imageBlobs.push(blob)
					postMessage({ id: self.id, jobStatus: 'progress' })
					resolve();
				})
				await syncPromise
			})
		).then( () => {
			// generate link name and filename
			const date = new Date()
			const time = `${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`
			
			const linkText = `#${self.id} - ${imageBlobs.length} image${imageBlobs.length > 1 ? 's' : ''}`
			let filename = `squarifier_${date.getMonth()+1}-${date.getDate()}-${date.getFullYear() % 1000}-${time.replace(':','')}`
			let linkURL
			
			// zip the blobs, only do this if more than 1 image
			if (imageBlobs.length > 1) {
				let zip = new JSZip()
				imageBlobs.forEach( (blob, i) => {
					zip.folder("squared_images").file(`image${i+1}.png`, blob)
				})
				
				// then finally convert zipped images into data url for download
				zip.generateAsync({type: "blob"})
				.then( blob => {
					filename = `${filename}.zip`;
					linkURL = URL.createObjectURL(blob)
					postMessage({
						id: self.id,
						jobStatus: "complete",
						linkText,
						filename,
						linkURL,
					})
				})
			} else {
				filename = `${filename}.png`;
				linkURL = URL.createObjectURL(imageBlobs[0])
				postMessage({
					id: self.id,
					jobStatus: "complete",
					linkText,
					filename,
					linkURL,
				})
			}
		})
	} catch (err) {
		console.error(err);
		postMessage({id: self.id, jobStatus: 'error'});
	}
}