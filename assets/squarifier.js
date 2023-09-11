/* TODO
* - bg color options (fill color for squared images)
* - size options (?) - can't upscale so probably not
* - test and enable the following image types: 
*   -- AVIF, TIFF, WEBP, SVG, BMP
* - loading spinner on in-progress jobs
* - cancel button on in-progress jobs
* - check size of loaded files and show warning if it's going to take a while (i.e. more than 50-100mb)
* - downloading finished images closes the web worker
* - button for clearing results w/ confirmation if not in error state
	-- this button will also clean up the worker

*/

// not sure where else to track this atm
window.currentJobId = 1;
window.workers = {};

function setupStartButton() {
	const button = document.getElementById("start-button")?.addEventListener("click", () => {
		if (document.getElementById("fileinput").files.length <= 0) { return }
		dispatchJob();
		clearInput();
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
			
			/* TODO not sure if I actually want this
			const sizeThreshold = 30000000; // 30 MB
			const fileSizeSum = filelist.reduce( (acc, curr) => {acc + curr.size}, 0);
			if (fileSizeSum > sizeThreshold) {
				errorMessage.innerText = "Large files detected - processing may take longer than expected"
				errorMessage.style.display = "block";
			}
			*/
			
			if (fileInput.files && fileInput.files.length > 0) {
				document.getElementById("start-button").style.visibility = "visible"
				document.getElementById("image-count").innerText = `${fileInput.files.length} selected`
			}
			if (fileInput.files && fileInput.files.length > 1) {
				document.querySelectorAll(".multi-image-notice").forEach(el => {
					if (window.clientWidth > 767 && el.classList.contains("mobile-only")) { return; }
					el.style.visibility = "visible";
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

function dispatchJob() {
	// clones output link template and sets up required data attributes
	// then dispatches the processing+zip job to a new web worker
	// all further updates and terminating worker handled by updateJobProgress/output link click handler
	const files = Array.from(document.getElementById("fileinput").files);
	const outputLink = document.getElementById("output-template").content.cloneNode(true).children[0]
	const outputContainer = document.querySelector(".outputLinkContainer")
	
	outputLink.dataset.jobId = window.currentJobId;
	outputLink.dataset.current = 0;
	outputLink.dataset.totalImages = files.length;
	worker = new Worker("assets/worker.js")
	worker.postMessage({ message: "initialize", files, id: window.currentJobId })
	worker.onmessage = updateJobProgress;
	window.workers[window.currentJobId] = worker;
	window.currentJobId += 1
	
	outputLink.innerText = `Processing images: 1/${files.length}`
	outputContainer.insertBefore(outputLink, outputContainer.firstElementChild)
}

function updateJobProgress(msg) {
	// get output link with data-job-id === id and update status
	// this function will also handle showing/hiding the loading spinner CSS animation
	const job = document.querySelector(`[data-job-id='${msg.data.id}']`)
	if (!job) { 
		console.error(`Can't find job with ID ${msg.data.id}. Terminating worker.`);
		cleanUpWorker(msg.data.id)
		return
	}
	
	switch (msg.data.jobStatus) {
		// no data, just increment the current item in progress
		case 'progress':
			job.innerText = `Processing images: ${Number(job.dataset.current) + 1}/${job.dataset.totalImages}`
			job.dataset.current = Number(job.dataset.current) + 1
			break;
		
		// update link text and terminate/cleanup worker
		case 'error':
			job.innerText = `Error during processing, please retry`
			job.style.backgroundColor = "lightpink"
			cleanUpWorker(msg.data.id)
			break;
			
		// data will be {linkURL: data URL, fileName: text string for file name, linkText: text string for link text (} - update link href and add bg-color change click event, then terminate worker
		// TODO add separate download and cancel buttons that are the links, make current links just containers
		case 'complete':
			job.download = msg.data.filename
			job.innerText = msg.data.linkText
			job.href = msg.data.linkURL
			job.addEventListener("click", () => {
				job.style.backgroundColor = "grey"
			})
			break;
	}
}

function cleanUpWorker(id) {
	window.workers[id].terminate();
	delete window.workers[id]
}

function clearInput() {
	document.getElementById("inputform").reset();
	document.getElementById("image-count").innerText = '';
}

setupPrivacyAccordion()
setupStartButton()
setupFileInputs()