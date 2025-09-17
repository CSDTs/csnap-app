function updateHTML() {
	// HTML to insert
	const html = `
        <main id="visualizer" hidden>
            <img alt="" id="converted-image" />
            <canvas id="style-canvas"></canvas>
        </main>
        <section id="vis-progress" hidden>
            <p>Transferring Style. Please Wait...</p>
            <div class="wrapper">
                <div class="slider">
                    <div class="line"></div>
                    <div class="subline inc"></div>
                    <div class="subline dec"></div>
                </div>
            </div>
            <button>Stop Script</button>
        </section>
    `;
	// Find the <body> element
	const body = document.body;
	if (body) {
		// Insert after opening <body> tag, before any other content
		body.insertAdjacentHTML("afterbegin", html);
	}

	document.querySelector("#vis-progress button").addEventListener("click", () => {
		world.children[0].stop();
		let progress = document.querySelector("#vis-progress");
		progress.hidden = true;
		progress.style.display = "none";
	});
}
updateHTML();
