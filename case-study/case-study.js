$(function() {
	screenBuilder.caseStudy = function(thisPageData, Section, $elem) {

		var tl = new TimelineLite();
		var forMobile = new mobileEnhancement();
			
		if(scrollingMode === "horizontal"){
			$(Section).addClass("hr-case-study")	
		}

		function mobileEnhancement() {
			// call by forMobile.toggleControls
			var $activeElem;
			var csControls = Section.find(".case_study_controls")
			var csButtons = csControls.find(".case_study_select ")
			var tempControls = Section.find(".tempControls")

			function handler(){
				TweenLite.to(csButtons, 0.5, {opacity: 1})
				TweenLite.to(tempControls, 0.5, {opacity: 0, zIndex: 0})
			}

			this.toggleControls = function(elem){
				$activeElem = elem

				TweenLite.to(csButtons, 0.5, {opacity: 0})
				TweenLite.to(tempControls, 0.5, {opacity: 1, zIndex: 20})
				$activeElem.scroll(handler)
			}

		}

		if(mobileDevice()){
			// $(".casestudy_container").addClass("mobileMode");
			//add swipe up/down...
			/*var carouselHammerEvents;
			carouselHammerEvents = new Hammer($(".carousel_container")[0]);	
			carouselHammerEvents.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
			
			var carouselOn = 0;
			
			hammerEvents.off("swipeup");
			hammerEvents.on("swipeup", function(e) {
				
			});

			hammerEvents.off("swipedown");
			hammerEvents.on("swipedown", function(e) {
				
			});*/
		}
			
		var totalPages = thisPageData.pages.length;
		var seenPages = thisPageData.pages.map(function() {
			return false;
		});
		
		seenPages[0] = true;

		$elem(".case_study_width").width(Number(100 * thisPageData.pages.length)+Number(1) + "%");
		$elem(".case_study_page").width((100 / thisPageData.pages.length) + "%");

		$elem(".case_study_select").first().addClass("selected already-selected");

		if (scrollingMode === "vertical") {
			// $elem(".case_study_page").first().css({height: "auto"});

			$elem(".case_study_select").click(function(){
				$elem(".case_study_select").removeClass("selected");
				$(this).addClass("selected already-selected");

				var index = $(this).index();

				changePage(index);
			});
		}

		if (totalPages === 1) {
			if (thisPageData.allowNext) {
				thisPageData.allowNext(true);
			}
		}

		function changePage(index) {
			//$elem(".case_study_page").css({height: 0});

			var selected = $elem(".case_study_page").eq(index);
			if (scrollingMode === "vertical"){
				selected.css({height: "auto"});
			}

			var elemWidths = 100 / thisPageData.pages.length;
			TweenLite.set($elem(".case_study_width"), {x: (-elemWidths * index) + "%"});

			var layout = thisPageData.pages[index].layout;
			
			if(layout == "double")
			{
				if(thisPageData.pages[index].parts[0].tailxpos != null){movetail1 = thisPageData.pages[index].parts[0].tailxpos;}
				if(thisPageData.pages[index].parts[1].tailxpos != null){movetail2 = thisPageData.pages[index].parts[1].tailxpos;}
			}else{
				movetail1 = false;
				movetail2 = false;
			}
			
			tl.time(tl.duration(), false);
			animateEntry(layout, selected);

			seenPages[index] = true;

			if (seenPages.indexOf(false) < 0) {
				if (thisPageData.allowNext) {
					thisPageData.allowNext(true);
				}
			}
		}

		function animateEntry(layout, selected) {
			
			switch(layout) {
			case "intro":
				var intro = selected.find(".case_study_part");

				tl.from(intro, 0.4, {autoAlpha: 0});
				//tl.from(intro, 0.4, {autoAlpha: 0, y: "50%"});
				break;
			case "single":
				var img = selected.find(".case_study_part_image");
				var content = selected.find(".case_study_part_content");

				tl.from(img, 0.4, {autoAlpha: 0});
				tl.from(content, 0.4, {autoAlpha: 0}, "-=0.25");
				//tl.from(img, 0.4, {autoAlpha: 0, x: "-50%"});
				//tl.from(content, 0.4, {autoAlpha: 0, x: "50%"}, "-=0.25");

				break;
			case "double":
				var partOdd = selected.find(".case_study_part:nth-of-type(odd)");
				var partEven = selected.find(".case_study_part:nth-of-type(even)");
				
				if(mobileDevice()){forMobile.toggleControls(selected)}

				tl.from(partOdd, 0.4, {autoAlpha: 0});
				tl.from(partOdd.find(".case_study_part_content"), 0.5, {autoAlpha: 0}, "-=0.3");
				tl.from(partEven, 0.4, {autoAlpha: 0}, "-=0.1");
				tl.from(partEven.find(".case_study_part_content"), 0.5, {autoAlpha: 0}, "-=0.3");
				//tl.from(partOdd, 0.4, {autoAlpha: 0, x: "-50%"});
				//tl.from(partOdd.find(".case_study_part_content"), 0.5, {autoAlpha: 0, y: "50%"}, "-=0.3");
				//tl.from(partEven, 0.4, {autoAlpha: 0, x: "50%"}, "-=0.1");
				//tl.from(partEven.find(".case_study_part_content"), 0.5, {autoAlpha: 0, y: "50%"}, "-=0.3");
				break;
			}
		}
		
		function PartSubscribeCS()
		{
			// save lastActivePart
			if(Number(activePart()) > 0)
			{
				thisPageData.lastActivePart = Number(activePart());
			}

			if(Number(activePart()) <= seenPages.length-1 && Number(activePart()) >= 0){
				changePage(Number(activePart()));
				$elem(".case_study_select").eq(Number(activePart())).addClass("selected already-selected");
				//console.log("case study: " + Number(activePart()));
			}
		}
		
		thisPageData.subscribeTo = function() {
			if(scrollingMode === "horizontal"){
				
				thisPageData.partsAmount = seenPages;
				
				if(thisPageData.lastActivePart == undefined)
				{
					thisPageData.lastActivePart = 0;
				}	
				
				//console.log("subscribe CS");
				subscription = activePart.subscribe(PartSubscribeCS);
			}
		};
		
		thisPageData.activate = function() {
			
		};
				
		thisPageData.deactivate = function() {
			
		};
		
	};
});