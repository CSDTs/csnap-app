export let knownDomains = {
	"Snap!Cloud": "https://csdt.org",
	"Snap!Cloud (staging)": "http://45.33.64.197:8000",
	"localhost (default)": "http://localhost:8000",
	"localhost (alt)": "http://127.0.0.1:8000",
	"localhost (secure)": "https://localhost:4431",
	"fly.dev": "https://csdt-site.fly.dev",
	"csdt-media.s3.us-east-2.amazonaws.com": "https://csdt-media.s3.us-east-2.amazonaws.com",
	"django-aws": "https://csdt.site",
	render: "https://csdt-development-latest.onrender.com",
};
export let defaultDomain = knownDomains["Snap!Cloud"];

export let genericErrorMessage =
	"There was an error while trying to access\n" + "a CSnap!Cloud service. Please try again later.";

export function init() {
	this.apiBasePath = "/api";
	this.url = this.determineCloudDomain() + this.apiBasePath;
	this.username = null;
	this.classroom_id = "";
	this.disabled = false;
	this.application_id = 97;
	this.classroom_id = "";
	this.dataID = "";
	this.imgID = 1000;
	this.getCSRFToken();

	if (typeof config !== "undefined") {
		if (config.urls !== undefined) {
			if (config.urls.create_project_url !== undefined) {
				this.create_project_url = config.urls.create_project_url;
			}
			if (config.urls.create_file_url !== undefined) {
				this.create_file_url = config.urls.create_file_url;
			}
			if (config.urls.list_project_url !== undefined) {
				this.list_project_url = config.urls.list_project_url;
			}
			if (config.urls.login_url !== undefined) {
				this.login_url = config.urls.login_url;
			}
			if (config.urls.user_detail_url !== undefined) {
				this.user_detail_url = config.urls.user_detail_url;
			}
			this.user_api_detail_url = config.urls.user_api_detail_url;
			if (config.urls.project_url_root !== undefined) {
				this.project_url_root = config.urls.project_url_root;
			}
		}

		if (typeof config.application_id !== "undefined") {
			this.application_id = config.application_id;
		}
		if (config.project !== undefined) {
			if (config.project.project_url !== undefined) {
				this.project_url = config.project.project_url;
			}
			if (config.project.id !== undefined) {
				this.project_id = config.project.id;
			}
			if (config.project.approved !== undefined) {
				this.project_approved = config.project.approved;
			}
		}
	}
}

export function determineCloudDomain() {
	// We dynamically determine the domain of the cloud server.
	// This allows for easy mirrors and development servers.
	// The domain is determined by:
	// 1. <meta name='snap-cloud-domain' location="X"> in snap.html.
	// 2. The current page's domain
	var currentDomain = window.location.origin, // host includes the port.
		metaTag = document.head.querySelector("[name='snap-cloud-domain']"),
		cloudDomain = this.defaultDomain,
		domainMap = this.knownDomains;

	if (metaTag) {
		return metaTag.getAttribute("location");
	}

	Object.keys(domainMap).some(function (name) {
		var server = domainMap[name];
		if (Cloud.isMatchingDomain(currentDomain, server)) {
			cloudDomain = server;
			return true;
		}
		return false;
	});

	return cloudDomain;
}

export function request(method, path, onSuccess, onError, errorMsg, wantsRawResponse, body) {
	if (this.disabled) {
		return;
	}

	var request = new XMLHttpRequest(),
		myself = this,
		fullPath =
			this.url + (path.indexOf("%username") > -1 ? path.replace("%username", encodeURIComponent(this.username)) : path);

	if (path.includes("/accounts/")) {
		fullPath = this.determineCloudDomain() + path;
	}

	if (path.includes("/media/")) {
		fullPath = path;
	}

	// if (path.includes("csdt-media.s3.us-east-2")) {
	// 	fullPath = path;
	// }

	try {
		request.open(method, fullPath, true);
		request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		request.withCredentials = true;
		request.onreadystatechange = function () {
			if (request.readyState === 4) {
				if (request.responseText) {
					var response =
						!wantsRawResponse || request.responseText.indexOf('{"errors"') === 0
							? JSON.parse(request.responseText)
							: request.responseText;

					if (response.errors) {
						onError.call(null, response.errors[0], errorMsg);
					} else {
						if (onSuccess) {
							onSuccess.call(null, response.message || response);
						}
					}
				} else {
					if (onError) {
						onError.call(null, errorMsg || Cloud.genericErrorMessage, myself.url);
					} else {
						myself.genericError();
					}
				}
			}
		};
		request.send(body);
	} catch (err) {
		onError.call(this, err.toString(), "Cloud Error");
	}
}

// Not sure what type of session we would want to use... maybe just
// create localStorage object and load with that instead of making API call?
export function initSession(onSuccess) {
	var myself = this;
	myself.checkCredentials(onSuccess);
	// if (location.protocol === 'file:') {
	//     // disabled for now (jens)
	//     return;
	// }
	// this.request(
	//     'POST',
	//     '',
	//     function () {

	//         myself.checkCredentials(onSuccess);
	//     },
	//     function () {},
	//     null,
	//     true
	// );
}

export function checkCredentials(onSuccess, onError, response) {
	var myself = this;
	this.getCurrentUser(
		function (user) {
			if (user.username) {
				myself.username = user.username;
				myself.user_id = user.id;
				myself.verified = true;
			}
			if (onSuccess) {
				onSuccess.call(null, user.username, user.id, user.role, response ? JSON.parse(response) : null);
			}
		},
		(data) => {
			console.log(data);

			onError(data);
		}
	);
}

export function login(username, password, persist, onSuccess, onError) {
	var myself = this;

	let myCallBack = function (data, textStatus, jqXHR) {
		myself.checkCredentials(onSuccess);
	};

	this.getCSRFToken();
	$.post(
		"/accounts/login/",
		{
			login: username,
			password: password,
		},
		myCallBack
	).fail((data) => {
		console.log(data);
		onError(data);
	});
}

export function logout(onSuccess, onError) {
	this.username = null;
	this.user_id = null;
	this.getCSRFToken();
	$.post("/accounts/logout/", {}, onSuccess, "json").fail(onError);
}

export function updateURL(URL) {
	if (window.history !== undefined && window.history.pushState !== undefined) {
		window.history.pushState({}, "", "/projects/" + URL + "/run");
	}
}

export function dataURItoBlob(dataURI, type) {
	let binary;
	if (dataURI.split(",")[0].indexOf("base64") >= 0) binary = atob(dataURI.split(",")[1]);
	else binary = unescape(dataURI.split(",")[1]);
	//var binary = atob(dataURI.split(',')[1]);
	let array = [];
	for (var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	return new Blob([new Uint8Array(array)], {
		type: type,
	});
}

export function getClassroomList(callBack, errorCall) {
	let myself = this;
	this.withCredentialsRequest(
		"GET",
		"/team/?user=" + myself.user_id,
		callBack,
		errorCall,
		"You must be logged in to view classrooms."
	);
}

export function getCSRFToken() {
	function getCookie(name) {
		var cookieValue = null;
		if (document.cookie && document.cookie != "") {
			var cookies = document.cookie.split(";");
			for (var i = 0; i < cookies.length; i++) {
				var cookie = jQuery.trim(cookies[i]);
				// Does this cookie string begin with the name we want?
				if (cookie.substring(0, name.length + 1) == name + "=") {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}
	var csrftoken = getCookie("csrftoken");

	function csrfSafeMethod(method) {
		// these HTTP methods do not require CSRF protection
		return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method);
	}

	function sameOrigin(url) {
		// test that a given url is a same-origin URL
		// url could be relative or scheme relative or absolute
		var host = document.location.host; // host + port
		var protocol = document.location.protocol;
		var sr_origin = "//" + host;
		var origin = protocol + sr_origin;
		// Allow absolute or scheme relative URLs to same origin
		return (
			url == origin ||
			url.slice(0, origin.length + 1) == origin + "/" ||
			url == sr_origin ||
			url.slice(0, sr_origin.length + 1) == sr_origin + "/" ||
			// or any other URL that isn't scheme relative or absolute i.e relative.
			!/^(\/\/|http:|https:).*/.test(url)
		);
	}

	$.ajaxSetup({
		beforeSend: function (xhr, settings) {
			if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
				// Send the token to same-origin, relative URLs only.
				// Send the token only if the method warrants CSRF protection
				// Using the CSRFToken value acquired earlier
				xhr.setRequestHeader("X-CSRFToken", csrftoken);
			}
		},
	});
}

// Projects

export function saveProject(projectName, body, onSuccess, onError) {
	// Expects a body object with the following paramters:
	// xml, media, thumbnail, remixID (optional), notes (optional)

	var myself = this;
	this.checkCredentials(function (username) {
		if (username) {
			let complete = "<snapdata>" + body.xml + body.media + "</snapdata>";
			let xml_string = "data:text/xml," + encodeURIComponent(complete);
			let xml_blob = myself.dataURItoBlob(xml_string, "text/xml");
			let xml = new FormData();

			xml.append("file", xml_blob);

			let img_string = body.thumbnail;
			let img_blob = myself.dataURItoBlob(img_string, "image/png");
			let img = new FormData();
			img.append("file", img_blob);

			let xml_id, img_id;
			let completed = 0;

			let successXML = function (data) {
				completed++;
				xml_id = data.id;
				if (completed === 2) {
					myself.createProject(projectName, xml_id, img_id, onSuccess, onError);
				}
			};

			let successIMG = function (data) {
				completed++;
				img_id = data.id;
				if (completed === 2) {
					myself.createProject(projectName, xml_id, img_id, onSuccess, onError);
				}
			};

			myself.saveFile(img, successIMG, (err) => {
				console.error(err);
				onError();
			});
			myself.saveFile(xml, successXML, onError);
		} else {
			onError.call(this, "You are not logged in", "CSnap!Cloud");
		}
	});
}

export function saveFile(file, onSuccess, onError) {
	this.getCSRFToken();
	$.ajax({
		type: "PUT",
		url: this.apiBasePath + "/files/",
		data: file,
		processData: false,
		contentType: false,
		success: onSuccess,
	}).fail(onError);
}

export function createProject(projectName, dataNum, imgNum, onSuccess, onError) {
	if (this.project_id === null || this.project_id === undefined || typeof this.project_id === undefined) {
		$.post(
			this.apiBasePath + "/projects/",
			{
				name: projectName,
				description: "",
				classroom: this.classroom_id,
				application: this.application_id,
				project: dataNum,
				screenshot: imgNum,
			},
			onSuccess,
			"json"
		).fail(onError);
	} else {
		$.ajax({
			type: "PUT",
			url: this.apiBasePath + "/projects/" + this.project_id + "/",
			data: {
				name: projectName,
				description: "",
				classroom: dataNum.classroom_id,
				application: this.application_id,
				project: dataNum,
				screenshot: imgNum,
			},
			success: onSuccess,
			dataType: "json",
		}).fail(onError);
	}
}

export function getProjectList(onSuccess, onError, withThumbnail) {
	var path = `/projects/?owner=${this.user_id}&application_type=CSPRO`;

	// if (withThumbnail) {
	//     path += '&withthumbnail=true';
	// }

	this.withCredentialsRequest("GET", path, onSuccess, onError, "Could not fetch projects");
}

export function getThumbnail(url, onSuccess, onError) {
	let texture = null;
	console.log(url);
	fetch(url)
		.then((res) => {
			if (res.ok) texture = url;
			else texture = this.determineCloudDomain() + "/csnap_pro/csdt/img/project_placeholder.png";
			return texture;
		})
		.finally(() => {
			onSuccess(texture);
		})
		.catch(() => {
			onError();
		});
}

export function getProject(project, delta, onSuccess, onError) {
	console.log(project.project_url);
	this.request("GET", project.project_url, onSuccess, onError, "Could not fetch project " + project.name, true);
}
