/*
Author: Zukaro Travon
Date: 12/10/2019
*/

window.onload = console.info("This website was written by Zukaro Travon");

var clock;
var today; // We time travel when editing, in order to preserve the correct date when we save
var currentUser;

class Issue {
    constructor(timestamp, user, type, header, content) {
        this.timestamp = timestamp;
        this.user = user;
        this.type = type;
        this.header = header;
        this.content = content;
    }
}

class News {
    constructor(timestamp, header, src, content) {
        this.timestamp = timestamp;
        this.header = header;
        this.src = src;
        this.content = content;
    }
}

class User {
    constructor(uid, name, avatar, admin = false) {
        this.uid = uid;
        this.name = name;
        this.avatar = avatar;
        this.admin = admin;
    }
}

function submitReport() {
    console.info("Submitting report");
    var types = document.getElementById("issue-type");
    var type = types.options[types.selectedIndex].text;
    var header = document.getElementById("issue-header").value;
    var content = document.getElementById("issue-content").value;
    if (type !== "Select Problem Type" && header !== "" && content !== "") {
        firebase.database().ref("issues").child(Date.now()).set({
            user: currentUser.uid,
            type: type,
            header: header,
            content: content,
        });
        document.getElementById("issue-type").getElementsByTagName("option")[0].selected = 'selected';
        document.getElementById("issue-header").value = "";
        document.getElementById("issue-content").value = "";
        document.getElementById("report-modal").style.display = "none";
        alert("Report submit");
    }
}

function loadReports() { // TODO: call this from somewhere that does something with the data; also separate view from model in News sections too
    // TODO: we need a way to limit reports we load, but also search them and sort them
    // Look into queries on database
    return firebase.database().ref("issues").orderByChild('ups').once('value').then(function(snapshot) {
        var issues = [];
        snapshot.forEach(function(issue) {
            issues.push(new Issue(issue.key, issue.val().user, issue.val().type, issue.val().header, issue.val().content));
        });
        if (issues.length) {
            console.info("Loading " + issues.length + " report(s)");
            return issues;
        } else {
            console.info("No reports found");
            return null;
        }
    });
}

function register(user) {
    // TODO: validate on database, and add error message if these are left blank
    // TODO: make sure we can only register if the user does not already exist (database validation)
    currentUser = user;
    userExists(user.uid).then(function(exists) {
        if (exists) {
            console.info("Updating user at UID: " + user.uid);
            firebase.database().ref("users").child(user.uid).child("admin").once('value').then(snapshot => snapshot.val()).then(function(verified) {
                firebase.database().ref("users").child(user.uid).set({
                    name: user.name,
                    avatar: user.avatar,
                    admin: verified
                });
            });
        } else {
            console.info("Registering user with UID: " + user.uid);
            firebase.database().ref("users").child(user.uid).set({
                name: user.name,
                avatar: user.avatar,
                admin: null
            });
        }
    });
}

function userExists(uid) {
    return firebase.database().ref("users").child(uid).once('value').then(function(snapshot) {
        return snapshot.exists();
    });
}

function loadUserData(uid) {
    console.info("Loading user data");
    return firebase.database().ref("users").child(uid).once('value').then(function(user) {
        if (user.val()) {
            return new User(user.key, user.val().name, user.val().avatar, user.val().admin);
        } else {
            return null;
        }
    });
}

function members(filter = "") {
    return firebase.database().ref("users").once('value').then(function(snapshot) {
        var users = [];
        snapshot.forEach(function(user) {
            switch (filter) {
                case "users":
                    if (!user.val().admin) {
                        users.push(new User(user.key, user.val().name, user.val().avatar));
                    }
                    break;
                case "admins":
                    if (user.val().admin) {
                        users.push(new User(user.key, user.val().name, user.val().avatar, true));
                    }
                    break;
                default:
                    users.push(new User(user.key, user.val().name, user.val().avatar, user.val().admin));
            }
        });
        return users;
    });
}

function writeNews() {
    // TODO: validate on database, and add error message if these are left blank
    var header = document.getElementById("news-header").value;
    var content = document.getElementById("news-content").value;
    var src = document.getElementById("news-src").value;
    if (today > 0 && header !== "" && content !== "") {
        firebase.database().ref("news").child(today).set({
            header: header,
            src: src,
            content: content
        });
        resetPage();
    }
}

function loadNews(editor = false) {
    return firebase.database().ref("news").orderByChild('ups').limitToLast(5).once('value').then(function(snapshot) {
        var newsArray = [];
        snapshot.forEach(function(item) {
            newsArray.push(new News(item.key, item.val().header, item.val().src, item.val().content));
        });
        if (newsArray.length) {
            newsArray.reverse();
            console.info("Loading " + newsArray.length + " news item(s)");
            newsArray.forEach(newsContent);
            if (editor) {
                console.info("Loading the editor");
                newsArray.forEach(editNewsContent);
            }
        } else {
            console.info("No news found");
            element = document.getElementById("news-section").appendChild(document.createTextNode("News database is empty or failed to load!"));
        }
    });
}

function unprivileged() {
    clearTimeout(clock);
    clock = null;
    document.getElementById("news-header").value = "";
    document.getElementById("news-src").value = "";
    document.getElementById("news-content").value = "";
    document.getElementById("desktopdate").value = "";
    document.getElementById("mobiledate").value = "";
    document.getElementById("desktoptime").value = "";
    document.getElementById("mobiletime").value = "";
    document.getElementById("news-header").disabled = true;
    document.getElementById("news-src").disabled = true;
    document.getElementById("news-content").disabled = true;
    document.getElementById("submit").disabled = true;
    document.getElementById("cancel").disabled = true;
    document.getElementById("admin-list").innerHTML = "";
    document.getElementById("news-section").innerHTML = "";
}

function privileged() {
    if (!clock) {
        clock = setInterval(updateTime, 1000);
    }
    document.getElementById("news-header").disabled = false;
    document.getElementById("news-src").disabled = false;
    document.getElementById("news-content").disabled = false;
    document.getElementById("submit").disabled = false;
    document.getElementById("cancel").disabled = false;
}

function copyUID(uid) {
    uid.onclick = function() {
        document.execCommand("copy");
    }
    uid.addEventListener("copy", function(event) {
        event.preventDefault();
        if (event.clipboardData) {
            event.clipboardData.setData("text/plain", uid.textContent);
            console.info("Copied UID: " + event.clipboardData.getData("text"));
            uid.style.color = "orange";
            setTimeout(function() {
                uid.removeAttribute("style");
            }, 50);
        }
    });
}

function initializeUserLists(member, user) {
    var memberDiv = document.createElement("div");
    var labelDiv = document.createElement("div");
    var controlDiv = document.createElement("div");
    var memberIcon = document.createElement("i");
    var promoteIcon = document.createElement("i");
    var deleteIcon = document.createElement("i");
    var memberUID = document.createElement("p");
    var memberBadge = document.createElement("span");
    var adminButton = document.createElement("button");
    var deleteButton = document.createElement("button");
    var list = null;
    adminButton.className = "btn btn-warning float-right";
    deleteButton.className = "btn btn-danger float-right";
    deleteButton.onclick = function() {
        if (prompt("Type 'DELETE' to delete " + member.name) === "DELETE") {
            firebase.database().ref("users").child(member.uid).remove();
            // TODO: delete user's reports when we delete said user?
            location.reload();
        }
    }
    deleteIcon.className = "fas fa-trash fa-fw";
    memberDiv.className = "row";
    labelDiv.className = "col-8";
    controlDiv.className = "col-4";
    adminButton.appendChild(promoteIcon);
    deleteButton.appendChild(deleteIcon);
    memberUID.className = "users-uid";
    memberUID.appendChild(document.createTextNode(member.uid));
    memberBadge.appendChild(memberIcon);
    memberBadge.appendChild(document.createTextNode(" " + member.name));
    labelDiv.appendChild(memberBadge);
    labelDiv.appendChild(memberUID);
    memberDiv.appendChild(labelDiv);
    if (member.admin) {
        adminButton.onclick = function() {
            if (confirm("Demote " + member.name + "?")) {
                firebase.database().ref("users").child(member.uid).set({
                    name: member.name,
                    avatar: member.avatar,
                    admin: null
                });
                location.reload();
            }
        }
        memberIcon.className = "fas fa-user-check fa-fw";
        promoteIcon.className = "fas fa-user-minus fa-fw";
        list = document.getElementById("admin-list");
    } else {
        adminButton.onclick = function() {
            if (confirm("Promote " + member.name + " to administrator?")) {
                firebase.database().ref("users").child(member.uid).set({
                    name: member.name,
                    avatar: member.avatar,
                    admin: true
                });
                location.reload();
            }
        }
        memberIcon.className = "fas fa-user fa-fw";
        promoteIcon.className = "fas fa-user-plus fa-fw";
        controlDiv.appendChild(deleteButton);
        list = document.getElementById("user-list");
    }
    if (member.uid === user.uid) {
        memberBadge.id = "current-user";
    } else {
        controlDiv.appendChild(adminButton);
    }
    memberDiv.appendChild(controlDiv);
    list.appendChild(memberDiv);
    copyUID(memberUID);
}

function initializeReports(reports) {
    reports.forEach(function(report) {
        var calendarIcon = document.createElement("i");
        var clockIcon = document.createElement("i");
        var userIcon = document.createElement("i");
        var issueIcon = document.createElement("i");
        var headerText = document.createTextNode(report.header);
        var dateText = document.createTextNode(new Date(Number(report.timestamp)).toDateString() + " ");
        var timeText = document.createTextNode(new Date(Number(report.timestamp)).toLocaleTimeString() + " ");
        var issueText = document.createTextNode(report.type + " ");
        var contentText = document.createTextNode(report.content);
        var reportItem = document.createElement("div");
        var h3 = document.createElement("h3");
        var pDate = document.createElement("p");
        var pContent = document.createElement("p");
        var element = document.getElementById("report-section");
        var btnDelete = document.createElement("button");
        reportItem.className = "card card-body bg-dark report-item";
        reportItem.id = "report-item" + report.timestamp;
        pDate.className = "datetime";
        calendarIcon.className = "far fa-calendar fa-fw";
        clockIcon.className = "far fa-clock fa-fw";
        issueIcon.className = "fas fa-exclamation-triangle fa-fw";
        userIcon.className = "fas fa-user fa-fw";
        reportItem.appendChild(h3);
        h3.appendChild(headerText);
        reportItem.appendChild(document.createElement("hr"));
        reportItem.appendChild(pDate);
        pDate.appendChild(calendarIcon);
        pDate.appendChild(dateText);
        pDate.appendChild(clockIcon);
        pDate.appendChild(timeText);
        pDate.appendChild(issueIcon);
        pDate.appendChild(issueText);
        pDate.appendChild(userIcon);
        loadUserData(report.user).then(function(user) {
            if (user) {
                pDate.appendChild(document.createTextNode(user.name));
            } else {
                pDate.appendChild(document.createTextNode(report.user));
            }
        });
        pContent.appendChild(contentText);
        reportItem.appendChild(pContent);
        element.appendChild(reportItem);
        element.appendChild(document.createElement("br"));
        btnDelete.className = "btn btn-danger";
        btnDelete.id = "del" + report.timestamp;
        btnDelete.onclick = function() {
            if (prompt("Type 'RESOLVED' to delete report " + report.header) === "RESOLVED") {
                // Delete the news item if user types "DELETE" in all caps to confirm
                firebase.database().ref("issues").child(report.timestamp).remove();
                location.reload();
            }
        };
        btnDelete.appendChild(document.createTextNode("Resolve"));
        reportItem.appendChild(btnDelete);
    });
}

function initializeAdminPanel() {
    var reportHeading = document.getElementById("report-heading");
    var indicator = document.getElementById("indicator");
    reportHeading.onclick = function() {
        if (reportHeading.getAttribute("aria-expanded") === "false") {
            indicator.className = "fas fa-chevron-down fa-fw";
        } else {
            indicator.className = "fas fa-chevron-right fa-fw";
        }
    }
    unprivileged();
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            register(new User(user.uid, user.displayName, user.photoURL.slice(0, -11) + ".png"));
            var adminIcon = document.createElement("i");
            adminIcon.className = "fas fa-user-times fa-fw";
            console.info("UID: " + user.uid);
            members().then(function(users) { // User cannot read admin database if they're not an admin, thus we know we're an admin if this runs
                console.info("Authenticated");
                privileged();
                adminIcon.className = "fas fa-user-check fa-fw";
                loadNews(true);
                console.info("Loading " + users.length + " user record(s)");
                users.forEach(function(member) {
                    initializeUserLists(member, user);
                });
            });
            loadReports().then(function(reports) {
                initializeReports(reports)
            });
            document.getElementById("avatar").src = user.photoURL.slice(0, -11) + ".png";
            document.getElementById("username").appendChild(adminIcon);
            document.getElementById("username").appendChild(document.createTextNode(" " + user.displayName));
            var userUID = document.createElement("p");
            userUID.id = "uid-profile";
            userUID.appendChild(document.createTextNode(user.uid));
            document.getElementById("usercard").appendChild(userUID);
            copyUID(userUID);
            var logoutIcon = document.createElement("i");
            logoutIcon.className = "fas fa-sign-out-alt fa-fw"
            var logoutButton = document.createElement("button");
            logoutButton.className = "btn btn-warning";
            logoutButton.id = "logout";
            logoutButton.type = "button";
            logoutButton.appendChild(document.createTextNode("Logout "));
            logoutButton.appendChild(logoutIcon);
            logoutButton.addEventListener("click", function() {
                firebase.auth().signOut().then(function() {
                    userUID.parentNode.removeChild(userUID);
                    logoutButton.parentNode.removeChild(logoutButton);
                    document.getElementById("username").innerHTML = "";
                    unprivileged();
                });
            });
            document.getElementById("usercard").appendChild(logoutButton);
        } else {
            console.info("Logged out");
            document.getElementById("avatar").src = "../image/ic_person_48px.svg";
            var twitterLogin = document.createElement("input");
            twitterLogin.type = "image";
            twitterLogin.src = "https://cdn.cms-twdigitalassets.com/content/dam/developer-twitter/images/sign-in-with-twitter-gray.png"
            twitterLogin.addEventListener("click", function() {
                var provider = new firebase.auth.TwitterAuthProvider();
                firebase.auth().signInWithRedirect(provider);
                firebase.auth().getRedirectResult().then(function(result) {
                    if (result.credential) {
                        var token = result.credential.accessToken;
                        var secret = result.credential.secret;
                    }
                    var user = result.user;
                });
            });
            document.getElementById("username").appendChild(twitterLogin);
        }
    });
}

function initializeHomePage() {
    adminLink = document.getElementById("admin-link");
    userControls = document.getElementById("user-controls");
    adminLink.style.visibility = "hidden";
    userControls.style.visibility = "hidden";
    loadNews();
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            register(new User(user.uid, user.displayName, user.photoURL.slice(0, -11) + ".png"));
            userControls.style.visibility = "visible";
            var reportIssue = document.getElementById("report-issue");
            var closeModal = document.getElementsByClassName("close")[0];
            var modal = document.getElementById("report-modal");
            reportIssue.onclick = function() {
                modal.style.display = "block";
            }
            closeModal.onclick = function() {
                document.getElementById("issue-type").getElementsByTagName("option")[0].selected = 'selected';
                document.getElementById("issue-header").value = "";
                document.getElementById("issue-content").value = "";
                modal.style.display = "none";
            }
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                }
            }
            var userIcon = document.createElement("i");
            userIcon.className = "fas fa-user fa-fw";
            var username = document.getElementById("username");
            username.appendChild(userIcon);
            username.appendChild(document.createTextNode(" " + user.displayName));
            var controls = document.getElementById("controls");
            var logout = document.createElement("button");
            var logoutIcon = document.createElement("i");
            logoutIcon.className = "fas fa-sign-out-alt fa-fw";
            logout.className = "btn btn-outline-warning";
            logout.appendChild(document.createTextNode("Logout "));
            logout.appendChild(logoutIcon);
            logout.onclick = function() {
                firebase.auth().signOut().then(function() {
                    controls.innerHTML = "";
                    username.innerHTML = "";
                });
            }
            firebase.database().ref("users").child(user.uid).child("admin").once('value').then(snapshot => snapshot.val()).then(function(verified) {
                if (verified) {
                    userIcon.className = "fas fa-user-check fa-fw";
                    adminLink.style.visibility = "visible";
                }
                controls.appendChild(logout);
            });
        } else {
            console.info("Logged out");
            adminLink.style.visibility = "hidden";
            userControls.style.visibility = "hidden";
            var twitterLogin = document.createElement("input");
            twitterLogin.type = "image";
            twitterLogin.src = "https://cdn.cms-twdigitalassets.com/content/dam/developer-twitter/images/sign-in-with-twitter-gray.png"
            twitterLogin.addEventListener("click", function() {
                var provider = new firebase.auth.TwitterAuthProvider();
                firebase.auth().signInWithRedirect(provider);
                firebase.auth().getRedirectResult().then(function(result) {
                    if (result.credential) {
                        var token = result.credential.accessToken;
                        var secret = result.credential.secret;
                    }
                    var user = result.user;
                });
            });
            document.getElementById("username").appendChild(twitterLogin);
        }
    });
}

function resetPage() {
    document.getElementById("news-header").value = "";
    document.getElementById("news-src").value = "";
    document.getElementById("news-content").value = "";
    document.getElementById("news-section").innerHTML = "";
    loadNews(true);
    if (!clock) {
        clock = setInterval(updateTime, 1000);
    }
}

function updateTime() {
    today = Date.now();
    document.getElementById("desktopdate").value = new Date(today).toDateString();
    document.getElementById("mobiledate").value = new Date(today).toDateString();
    document.getElementById("desktoptime").value = new Date(today).toLocaleTimeString();
    document.getElementById("mobiletime").value = new Date(today).toLocaleTimeString();
}

function newsContent(news) {
    var calendarIcon = document.createElement("i");
    var clockIcon = document.createElement("i");
    var headerText = document.createTextNode(news.header);
    var dateText = document.createTextNode(new Date(Number(news.timestamp)).toDateString() + " ");
    var timeText = document.createTextNode(new Date(Number(news.timestamp)).toLocaleTimeString());
    var srcText = news.src;
    var contentText = document.createTextNode(news.content);
    var newsItem = document.createElement("div");
    var h3 = document.createElement("h3");
    var pDate = document.createElement("p");
    var img = document.createElement("img");
    var pContent = document.createElement("p");
    var element = document.getElementById("news-section");
    newsItem.className = "card card-body bg-dark news-item";
    newsItem.id = "news-item" + news.timestamp;
    pDate.className = "datetime";
    calendarIcon.className = "far fa-calendar fa-fw";
    clockIcon.className = "far fa-clock fa-fw";
    img.src = srcText;
    newsItem.appendChild(h3);
    h3.appendChild(headerText);
    newsItem.appendChild(document.createElement("hr"));
    newsItem.appendChild(pDate);
    pDate.appendChild(calendarIcon);
    pDate.appendChild(dateText);
    pDate.appendChild(clockIcon);
    pDate.appendChild(timeText);
    newsItem.appendChild(img);
    newsItem.appendChild(document.createElement("hr"));
    pContent.appendChild(contentText);
    newsItem.appendChild(pContent);
    element.appendChild(newsItem);
    element.appendChild(document.createElement("br"));
}

function editNewsContent(news) {
    var btnEdit = document.createElement("button");
    var btnDelete = document.createElement("button");
    var newsItem = document.getElementById("news-item" + news.timestamp);
    btnEdit.className = "btn btn-info";
    btnEdit.id = "edt" + news.timestamp;
    btnEdit.onclick = function() {
        // Edit the news item (we simply overwrite the item)
        clearTimeout(clock);
        clock = null;
        today = Number(news.timestamp);
        document.getElementById("desktopdate").value = new Date(today).toDateString();
        document.getElementById("mobiledate").value = new Date(today).toDateString();
        document.getElementById("desktoptime").value = new Date(today).toLocaleTimeString();
        document.getElementById("mobiletime").value = new Date(today).toLocaleTimeString();
        document.getElementById("news-header").value = news.header;
        document.getElementById("news-src").value = news.src;
        document.getElementById("news-content").value = news.content;
        scroll(0,0); // Jump back to the top of the page so we don't have to scroll
    };
    btnDelete.className = "btn btn-danger";
    btnDelete.id = "del" + news.timestamp;
    btnDelete.onclick = function() {
        if (prompt("Type 'DELETE' to delete post " + news.header) === "DELETE") {
            // Delete the news item if user types "DELETE" in all caps to confirm
            firebase.database().ref("news").child(news.timestamp).remove();
            resetPage();
        }
    };
    btnEdit.appendChild(document.createTextNode("Edit"));
    btnDelete.appendChild(document.createTextNode("Delete"));
    newsItem.appendChild(btnEdit);
    newsItem.appendChild(btnDelete);
}
