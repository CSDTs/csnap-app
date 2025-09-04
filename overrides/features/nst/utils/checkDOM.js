function checkForStyleTransferImage(type) {
	let img = document.querySelector(`#${type}-img`);
	if (img) return true;
	return false;
}

function getStyleTransferImage(type) {
	let image = document.querySelector(`#${type}-img`);
	if (image) return image;
	throw new Error(`You have not set a ${type} image yet`);
}

export { checkForStyleTransferImage, getStyleTransferImage };
