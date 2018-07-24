var pageSubscriberList = [];
var activePart = ko.observable("0");
var subscription;
var topicFirstPageSeq = -1;
var bookmarkInTopic = 0;
var topNavShow = ko.observable(true)
var bottomNavShow = ko.observable(true)

function buildTopicView(num) {
	// Set up stuff on a higher-than-page level

	////// First cleanup old page /////
	// Remove any open popus
	$(".popup").remove();
	TweenLite.set(".main_content", { opacity: 1 });


	//close the menu - if it's open...
	if (typeof menuOpen === "function") menuOpen(false);


	// scroll to page top
	TweenLite.set(".course_wrap", { scrollTo: 0 });

	if (thisTopic) {
		if (pageSubscriberList.length > 0) {
			_.each(pageSubscriberList, function(subscriber){
				subscriber.dispose();
			});
			pageSubscriberList = [];
		}

		_.each(thisTopic.screens, function(screen) {
			if (screen.onDestroy) {
				screen.onDestroy();
			}
		});
	}

	// set the current page
	currentPage(num);

	// Set this current page data, and expose topic
	requestedPage = allPages[currentPage()];
	topicNum = requestedPage.topicParent;
	thisTopic = course.topics[topicNum];

	if (requestedPage.type === "banner") {
		buildTopicView(requestedPage.sequence + 1);
		return;
	}

	if (thisTopic.status === "disabled") {
		buildTopicView(course.topics[topicNum+1].screens[0].sequence);
		return;
	}

	requestedPage.locked(false);
	thisTopic.locked(false);

	// Yes, this needs to be cleared regardless
	thisTopicComplete(false);

	// Make sure the screen num is upto date. Also sets lastTopicViewed
	updateScreenNum();

	// Set the position of content of top navigation
	var ifOnTheList = _.contains(course.changeNavType.screens, requestedPage.ref)
	if (requestedPage.ref === course.menu.ref) {
		$(".nav_cs_logo").show();
		$(".nav_course_title").removeClass("nav_course_title_full");
		$(".nav_menu_icon").hide();
		$(".nav_course_title").hide();
		$(".nav_drawer_wrap").show();
		$(".pretest_instruction").hide()
	}else if (ifOnTheList) {
		$(".nav_cs_logo").show();
		$(".nav_course_title").removeClass("nav_course_title_full");
		$(".nav_menu_icon").hide();
		$(".nav_course_title").hide();
		$(".nav_drawer_wrap").hide();
		
		if(requestedPage.type == "pre-test"){
			$(".pretest_instruction").find("p").html(course.changeNavType.instructionText)
			$(".pretest_instruction").show()
			$(".home_btn_pretest").show().click(function(){
				buildTopicView(dashboardPageNum);
			});
		}else{
			$(".pretest_instruction").hide()
			$(".home_btn_pretest").hide();
		}
	} else {
		$(".nav_cs_logo").hide();
		$(".nav_course_title").addClass("nav_course_title_full");
		$(".nav_menu_icon").show();
		$(".nav_course_title").show();
		$(".nav_drawer_wrap").show();
		$(".pretest_instruction").hide()

		if (course.menu.ref && currentPage() < pageDataFromRef(course.menu.ref).sequence) {
			$(".nav_menu_icon").hide();
		}
	}

	if (requestedPage.ref === course.menu.ref) {
		$(".nav_course_title").text(thisTopic.title);
	} else {
		$(".nav_course_title").text(course.title);
	}
	
	// Wipe the page before draw.
	$(".main_content").empty();

	// Set color scheme
	$("body").removeClass();
	if (thisTopic.keycolor) $("body").addClass("keycolor-" + thisTopic.keycolor);

	// Fade out screen, start building new page once it"s invisible
	TweenLite.to(".main_content", 0.1, {
		opacity: 0,
		onComplete: choiceScrollingMode
	});
}

function choiceScrollingMode(){
	if(scrollingMode === "horizontal") 		startPageBuilder_horizontal()
	else if(scrollingMode === "vertical") 	startPageBuilder_vertical()
}

function startPageBuilder_horizontal() {
	
	$(".course_wrap").addClass("hr_course_wrap");
	$(".hr_course_wrap").css("overflow", "hidden");

	// Everything here builds the individual pages within the topic.
	_.each(course.topics[topicNum].screens, function(thisPageData, i) {
		//debug.log("Rendering page: ", thisPageData.ref);

		thisPageData.next = course.topics[topicNum].screens[i + 1];
		thisPageData.prev = course.topics[topicNum].screens[i - 1];

		// allowNext for all compilted & no_interactions screens
		if ( (thisPageData.type === "banner" && thisPageData.screenNum === 0) ||
			 (thisPageData.locked() === false && thisTopic.complete()) 
		){
			thisPageData.allowNext(true);
		}

		// Subscribe to next active being called, set next page as unlocked
		thisPageData.allowNext.subscribe(function(newValue) {
			if (thisPageData.after && thisPageData.onComplete && newValue === true) {
				thisPageData.onComplete();
			}
			if ((COMMUNICATION_INTERFACE === "SCORM" && SCORM) | COMMUNICATION_INTERFACE === "INSPECTOR") {				
				setBookmark();
			}
		});

		// Enable easy mode for debugging
		if (course.debug.easyMode) thisPageData.allowNext(true);

		// Render templates - render.js
		renderPage(thisPageData);

		var c = currentPage.subscribe(function(newValue) {
			if (newValue == thisPageData.sequence) {
				if (thisPageData.activate) thisPageData.activate();
				thisPageData.active = true;
			} else if (newValue != thisPageData.sequence && thisPageData.active) {
				if (thisPageData.deactivate) thisPageData.deactivate();
				thisPageData.active = false;
			}
		});
		pageSubscriberList.push(c);
	});
	
	var theLastinTopic = thisTopic.screens[thisTopic.screens.length-1]
	var subnavBuildedAlready = false;
	var currentPageData;
	var prevPageData;
	var nextPageData;
	var navigateParts = false;
	
	if(topicNum >= firstTopicPosition)
	{
		var tNum = topicNum - firstTopicPosition;
		var qNum = overallTopicStars[tNum].length-1;
		bookmarkInTopic = overallTopicStars[tNum][qNum];
	}
	
	updateNavigations()
	fadeInTopic()
	
	//TOPIC RESUME POPUPS
	if(topicNum >= firstTopicPosition)
	{
		var resumingTopic = false;
		//if topic complete, or topic started - show restart popup
		if(thisTopic.complete() | bookmarkInTopic > 0)
		{
			resumingTopic = true;
		}
		//if resuming topic - show popup (send complete status)
		if(resumingTopic)
		{
			
			if(topicFirstPageSeq == -1)
			{
				topicFirstPageSeq = currentPageData.sequence;
				var pageNum = currentPageData.sequence + bookmarkInTopic;
				var jumpPageData = allPages[pageNum];
				if(thisTopic.complete() && (bookmarkInTopic == thisTopic.screens.length-1 | bookmarkInTopic == 0))
				{
					ShowTopicResume(true);
				}else if(bookmarkInTopic != 0)
				{
					goToJumpScreen(jumpPageData);
				}
			}else{
				topicFirstPageSeq = -1;
			}
		}
	}
	
	function updateNavigations(){
		currentPageData = allPages[Number(currentPage())]
		nextPageData = allPages[currentPageData.sequence + 1]
		prevPageData = allPages[currentPageData.sequence - 1]

		var conditionToActivate = currentPageData.type !== "dashboard" && currentPageData.allowNext()

		if (typeof currentPageData.partsAmount !== "undefined")	 navigateParts=true;
		
		if		(currentPageData.screenNum > 0) 	$(".prev_sub_btn").addClass("active");
		else if	(navigateParts) 					$(".prev_sub_btn").addClass("active");
		else if (currentPageData.screenNum <= 0)	$(".prev_sub_btn").removeClass("active");
		
		if 		(conditionToActivate)				$(".next_sub_btn").addClass("active");
		else if (navigateParts)						$(".next_sub_btn").addClass("active");
		else										$(".next_sub_btn").removeClass("active");

		if(typeof currentPageData.updateNavigationsInTemplate !== "undefined") currentPageData.updateNavigationsInTemplate();
		
		navigationController()
		buildOrRemoveSubnavForParts()
		markActivePart()
		checkAllScreensComplete()
		refreshBottomNavListiners()
		bindAllowNext()

		if(courseApproach == "gamification" && topicNum >= firstTopicPosition)
		{
			var tNum = topicNum - firstTopicPosition;
			var qNum = overallTopicStars[tNum].length-1;
			overallTopicStars[tNum][qNum] = currentPageData.screenNum;
		}

		saveSCORM ()
	}

	function navigationController(){

		// hide navigations
		var allDevices = _.contains(course.hideNavigations.allDevices, currentPageData.type);
		var mobileOnly = _.contains(course.hideNavigations.mobileOnly, currentPageData.type);
		
		if(allDevices){
			hideTopNavigation()
			hideBottomNavigation()
		}else if(!mobileDevice()){
			showTopNavigation()
			showBottomNavigation()
		}

		if(mobileDevice() && mobileOnly){
			hideTopNavigation()
			hideBottomNavigation()
		}
	}

	function buildOrRemoveSubnavForParts(){
		if(currentPageData.partsAmount){
			if(!subnavBuildedAlready){
				_.each(currentPageData.partsAmount, function(element,index){
					var partSelector = "<div class='marker'></div>"
					$(".bottom_subnav").append(partSelector);
					subnavBuildedAlready = true;
				})
			}
		}
		else $(".bottom_subnav").empty()
	}

	function markActivePart() {
		var partSelector = $(".bottom_subnav").find(".marker")
		if(partSelector.length >= 0){
			partSelector.removeClass("active")
			partSelector.eq(Number(activePart())).addClass("active")
		}
	}

	function bindAllowNext(){
		currentPageData.allowNext.subscribe(function (){
			updateNavigations()
		})
	}

	function refreshBottomNavListiners () {
		// * first unbinde to avoid multiple bindings
		$(".prev_sub_btn").off("click")
		$(".prev_sub_btn").on("click", function (){
			if( $(this).hasClass("active") ){
				if(navigateParts){
					if 		(activePart() > 0)											goToPart(Number(activePart())-1);
					else if (activePart() == 0 && currentPageData.screenNum === 0)		goToDashboard()
					else if (activePart() == 0 && currentPageData.screenNum !== 0)		goToPrevScreen();
				}
				else if (currentPageData.screenNum === 0)								goToDashboard()
				else 																	goToPrevScreen();
			}		
		});
		
		$(".next_sub_btn").off("click")
		$(".next_sub_btn").on("click", function (){
			if($(this).hasClass("active")){
				if(navigateParts){
					if		( activePart() == currentPageData.partsAmount.length-1
							&& currentPageData.screenNum === theLastinTopic.screenNum)		goToDashboard()
					else if	(activePart() == currentPageData.partsAmount.length-1) 			goToNextScreen();
					else																	goToPart(Number(activePart())+1);
				}
				else if (currentPageData.screenNum === theLastinTopic.screenNum)			goToDashboard();
				else																		goToNextScreen();
			}
		});

		// swiping screens
		if (currentPageData.type !== "instruction" && currentPageData.type !== "welcome-page"){
			
			hammerEvents.off("swiperight");
			hammerEvents.on("swiperight", function() {
				$('.prev_sub_btn').trigger('click');
			});

			hammerEvents.off("swipeleft");
			hammerEvents.on("swipeleft", function() {
				$('.next_sub_btn').trigger('click');
			});	

			
			if(mobileDevice()){
				hammerEvents.off("swipeup");
				hammerEvents.on("swipeup", function(e) {
					hideBottomNavigation()
					hideTopNavigation()
				});

				hammerEvents.off("swipedown");
				hammerEvents.on("swipedown", function(e) {
					showBottomNavigation()
					showTopNavigation()
				});
			}
		}
	}
	
	function goToJumpScreen (pageDataToJumpTo){
		cleanData(pageDataToJumpTo)
		checkAndUpdateLastVisitedPart(pageDataToJumpTo)
		showScreen(currentPageData, pageDataToJumpTo, true)
		updateScreen()
		updateNavigations()
	}	

	function goToPrevScreen (){
		cleanData(prevPageData)
		checkAndUpdateLastVisitedPart(prevPageData)
		showScreen(currentPageData, prevPageData)
		updateScreen()
		updateNavigations()
	}			

	function goToNextScreen (){
		cleanData(nextPageData)
		checkAndUpdateLastVisitedPart(nextPageData)
		activePart(0);
		showScreen(currentPageData, nextPageData)
		updateScreen()
		updateNavigations()
	}

	function goToDashboard (){
		cleanData()
		activePart(0);
		buildTopicView(dashboardPageNum);
		updateNavigations()
	}

	function goToPart (choesenPart){
		activePart(choesenPart);
		updateNavigations()
	}
	
	function cleanData(pageDataToCheck){
		navigateParts = false;
		subnavBuildedAlready = false;
		activePart(0)

		if(subscription){subscription.dispose();}
		if(pageDataToCheck && typeof pageDataToCheck.subscribeTo !== "undefined")	pageDataToCheck.subscribeTo();
		
		closePopup()
		hideScreens()
		$(".bottom_subnav").empty()
	}

	function updateScreen() {
		var horizontalViewport = $(".main_content").find(".section_wrap ").filter(function () { 
			return $(this).css('display') !== "none"
			})
		var pageInView = Number($(horizontalViewport.children("section")[0]).attr("data-screen"));
			
		currentPage(pageInView);
		updateScreenNum();
		saveSCORM()
	}

	function checkAndUpdateLastVisitedPart(pageDataToCheck){
		_.each(no_h_interactions, function(value, index){
			if(pageDataToCheck.type === value) pageDataToCheck.allowNext(true)
		})
		if(pageDataToCheck.lastActivePart){
			// * navigateParts needs be called again to show we are coming back to the screen		
			navigateParts = true;
			activePart(pageDataToCheck.lastActivePart)
		}	
	}
}		

function startPageBuilder_vertical() {

	// Everything here builds the individual pages within the topic.
	_.each(course.topics[topicNum].screens, function(thisPageData, i) {
		debug.log("Rendering page: ", thisPageData.ref);

		thisPageData.next = course.topics[topicNum].screens[i + 1];
		thisPageData.prev = course.topics[topicNum].screens[i - 1];

		if (thisPageData.type === "banner" || (thisPageData.locked() === false && thisTopic.complete())) {
			thisPageData.allowNext(true);
		}

		// Subscribe to next active being called, set next page as unlocked
		thisPageData.allowNext.subscribe(function(newValue) {
			checkAllScreensComplete();
			if (thisPageData.after && thisPageData.onComplete && newValue === true) {
				thisPageData.onComplete();
			}
			if (COMMUNICATION_INTERFACE === "SCORM" && SCORM) {
				setBookmark();
			}
			// contentScroll();
			// HACKY: ONLY NEEDED FOR CONDUCT RULES
			// if (_.contains(thisTopic.rules, "change-home")) {
			// 	if (thisTopic.complete()) {
			// 		course.menu.ref = "0.1";
			// 	}
			// }
		});

		// Enable easy mode for debugging
		if (course.debug.easyMode) thisPageData.allowNext(true);

		// unlock screen if next one was already visited
		if (i < screenNum) {
			thisPageData.locked(false);
			thisPageData.allowNext(true);
		}

		TweenLite.to(".bottom_nav", 0.2, { y: "100%" });
		contentScroll();
		

		if (thisPageData.type === "dashboard") {
			thisPageData.lastTopicComplete = lastTopicComplete;
		}

		//  Mark pages as complete if no interactions and only true if page is actually visited. Solves issues of half-completion on the dashboard
		// if (thisPageData.no_interaction) thisPageData.allowNext(true);

		/////////// Render templates - render.js ///////////
		renderPage(thisPageData);

		var c = currentPage.subscribe(function(newValue) {
			if (newValue == thisPageData.sequence) {
				if (thisPageData.activate) thisPageData.activate();
				thisPageData.active = true;
			} else if (newValue != thisPageData.sequence && thisPageData.active) {
				if (thisPageData.deactivate) thisPageData.deactivate();
				thisPageData.active = false;
			}
		});
   

		pageSubscriberList.push(c);

		if (thisPageData.after && thisPageData.allowNext() === true) {
			thisPageData.onComplete();
		}

		//// This might some day be useful, but not today!
		// if (thisPageData.type === "dashboard" && course.complete.status) {
		// 	makePopup({ref: course.complete.onCourseEnd});
		// }

	});

	// Start watching scrolling functionality
	$(".course_wrap").off("scroll");
	$(".course_wrap").scroll(_.debounce(contentScroll, 20));

	if (screenNum > 0 && thisTopic.screens[0].type !== "banner") {
		TweenLite.to(".course_wrap", 0.4, {
			scrollTo: {
				y: $(".main_content").children().eq(screenNum),
				offsetY: 64
			}
		});
	}

	// If the first page is a page without a next button, unlock the next page
	_.each(thisTopic.screens, function(screen, i){
		if (screen.screenNum === 0 && screen.no_interaction) {
			unhideScreens(screen, $(".container").eq(screen.screenNum));
		}
	});

	checkAllScreensComplete();
	saveSCORM ()
	fadeInTopic()
}

function contentScroll() {
	var thisPageData = allPages[currentPage()];
	var viewportOrientation;

	if(window.innerHeight > window.innerWidth){
		viewportOrientation = ($(window).height() / 10) * 5
	}
	else{
		viewportOrientation = $(window).height() / 3
	}

	var inViewport = $(".main_content").find(".container").isInViewport({
		tolerance: viewportOrientation
	});	

	if (inViewport.length > 0 ) {
		$(".main_content").find(".container").removeClass("inViewport");
		inViewport.addClass("inViewport");

		var pageInView = Number($(inViewport).attr("data-screen"));
		if (pageInView >= 0) {
			currentPage(pageInView);
		}
		updateScreenNum();

		//sync to the CS review tool
		if (COMMUNICATION_INTERFACE === "NONE" && UNICORN_COURSE_LOCATION === "REVIEW") {
			SetReviewPage(currentPage());
		}
		if (UNICORN_COURSE_LOCATION === "INSPECTOR") {
            setBookmark();
		}			

		if (window.matchMedia("(min-width: 640px)").matches || (thisPageData.background && !thisPageData.background.noMobile)) {
			var bgi = thisPageData.background;
			backgroundImage(bgi);
		} else {
			backgroundImage({
				src: "blank"
			});
		}
	}

	// Bottom Navigation & Bottom Viewport
	var viewportOffset =  0.85//85% height of screen
	if(mobileDevice()){
		viewportOffset = 0.65 //65% height of screen
	}
	var inBottomViewport = $(".main_content").find(".container").isInViewport({
		tolerance: $(window).height() * viewportOffset
	});	

	if (inBottomViewport.length > 0 ) {
		$(".main_content").find(".container").removeClass("inBottomViewport");
		inBottomViewport.addClass("inBottomViewport");

		var theLastinTopic = thisTopic.screens[thisTopic.screens.length-1]
		if($(".inBottomViewport").data("screen") === $(theLastinTopic)[0].sequence && $(".inBottomViewport").data("screen") !== 0 && (theLastinTopic.type != "assessment" |  (theLastinTopic.type == "assessment" && theLastinTopic.allowNext() == true))&& (theLastinTopic.type != "certification" |  (theLastinTopic.type == "certification" && theLastinTopic.allowNext() == true))){
			
			// show bottom nav for all topic from out of list
			if(_.contains(course.switchOffBottomNavForTopic, thisTopic.title) !== true){
				$(".main_content").find(".container").removeClass("inViewport");
				inBottomViewport.addClass("inViewport");
				theLastinTopic.allowNext(true)
				TweenLite.to(".bottom_nav", 0.4, { y: "0%" });

				// save scorm 
				if (pipwerks.SCORM.connection.isActive | COMMUNICATION_INTERFACE === "INSPECTOR") {
					setBookmark();
				}
				
				//  fix bug for too fast scrolling
					thisTopic.screens.forEach( function (screensInTopick){
						screensInTopick.allowNext(true)
					})

				// debuging				
					var screensComplete = _.pluck(thisTopic.screens, "allowNext").map(function(screen) {
						return ko.toJS(screen);
					});
					debug.log("Arrey of completed screens: ",  screensComplete);
			}
		} else {
			TweenLite.to(".bottom_nav", 0.2, { y: "100%" });
		}
	}

	// Catch when scolling is inposible
	if(thisTopic.screens.length == 1){
		// make screen active
		currentPage.subscribe(function(newValue) {
			if (newValue == thisPageData.sequence) {
				if (thisPageData.activate) thisPageData.activate();
				thisPageData.active = true;
			} else if (newValue != thisPageData.sequence && thisPageData.active) {
				if (thisPageData.deactivate) thisPageData.deactivate();
				thisPageData.active = false;
			}
		});
		// save scorm 
		if (pipwerks.SCORM.connection.isActive | COMMUNICATION_INTERFACE === "INSPECTOR") {			
			setBookmark();
		}
		// show nav
		if(_.contains(course.switchOffBottomNavForTopic, thisTopic.title) !== true){
			TweenLite.to(".bottom_nav", 0.4, { y: "0%" });
		}
	}
}

function checkAllScreensComplete() {
	// Update universal topic complete state
	var screensComplete = _.pluck(thisTopic.screens, "allowNext").map(function(screen) {
		return ko.toJS(screen);
	});

	var topicCompletions = _.every(screensComplete);
	if (topicCompletions) {
		thisTopic.complete(true);
		thisTopicComplete(true);

		// "unlocks"
		if (topicNum !== course.topics.length - 1 && course.topics[topicNum + 1].diagnosticStatus !== false && course.topics[topicNum + 1].diagnosticStatus !== true) {
			_.each(thisTopic.unlocks, function(topicToUnlock) {
				var toUnlock = course.topics[topicToUnlock];
				doUnlock(toUnlock);
			});
		}

		// "unlockRequirements"
		_.each(course.topics, function(topic){
			if(topic.unlockRequirements){
				var checkWhatComplite = _.map(topic.unlockRequirements, function(element, index){
					return course.topics[element].complete()
				})

				if (_.every(checkWhatComplite)) {
					doUnlock(topic);
				}				
			}
		})
	}


	function doUnlock(unlock) {
		if(unlock.diagnosticStatus !== false && unlock.diagnosticStatus !== true){
			unlock.locked(false);
			unlock.screens[0].locked(false);
			if (unlock.screens[0].type === "banner") {
				unlock.screens[1].locked(false);
			}
		}
	}
	
	
	if(casestudyFrom != 0)
	{
		var scrollTo = $(".main_content").find(".section_wrap").eq(casestudyJumpRef);
		reCenter(scrollTo);
	}
	
	if(casestudyJump) //&& casestudyFrom == 0
	{
		var scrollBackTo = $(".injected_page  div:visible:last");
		reCenter(scrollBackTo);
		casestudyJump = false;
	}
	

}

function updateScreenNum() {
	screenNum = _.findIndex(thisTopic.screens, function(screen) {
		return screen.ref === allPages[Number(currentPage())].ref;
	});

	if (screenNum === thisTopic.screens.length - 1) {
		lastTopicComplete = lastTopicComplete < topicNum ? topicNum : lastTopicComplete;
	}
}