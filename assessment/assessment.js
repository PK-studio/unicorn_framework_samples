$(function() {
	screenBuilder.assessment = function(thisPageData, Section, $elem) {
		// Reduce number of questions to random sample of X questions.
		var reduceQuestions;
		if (thisPageData.randomise) {
			reduceQuestions = _.sample(thisPageData.questions, thisPageData.numberOfQuestions);
		} else {
			reduceQuestions = thisPageData.questions.slice(0, thisPageData.numberOfQuestions);
		}
		
		var questionBank = reduceQuestions.map(function(q) {
			if (typeof q !== "object") {
				return pageDataFromRef(q);
			}
			return q;
		});

		function questionModel() {
			var self = this;

			if (thisTopic.assessmentPassed) {
				thisTopic.complete(true);
				thisPageData.allowNext(true);
			}

			self.questions = questionBank.map(function(opt, i) {
				var question = new Question(opt);

				question.selected = ko.observable("");

				question.enabled = ko.observable(false);
				if (i === 0) {
					question.enabled(true);
				}

				question.title = course.strings.question + " " + (i+1) + " " + course.strings.of + " " + questionBank.length;

				// Submits answer, checks what is correct and builds feedback. Saves result to thisPageData
				question.submit = function() {
					if (question.anyChecked()) {

						question.submitClicked(true);

						// $elem(".assessment_wrapper").eq(i).find(".assessment_feedback").css({ "display": "block" });

						// var answers = ko.toJS(_.pluck(question.options, "correct"));
						// var filterAnswers = _.without(answers, undefined);
						var correct = question.questionResult();
						// question.answerCorrect = correct;

						var feedbackResult = "";
						if (correct) {
							feedbackResult = course.feedback.correct;
						} else {
							feedbackResult = course.feedback.incorrect[question.type()];
						}

						var feedbackMessage = {
							feedback: feedbackResult,
							message: question.feedback
						};

						buildFeedback($elem(".assessment_wrapper").eq(i).find(".assessment_feedback"), feedbackMessage);

						self.scoring();

					}
				};

				question.nextActive = question.submitClicked;

				question.nextButton = function() {
					if (self.questions[i + 1] && question.nextActive()) {
						self.questions[i + 1].enabled(true);
						TweenLite.to(".course_wrap", 0.4, {
							scrollTo: {
								y: $(".assessment_wrapper").eq(i + 1),
								offsetY: 64
							},
							delay: 0.3
						});
					}
				};

				return question;
			});

			self.scoring = function() {

				var everyQ = _.every(_.pluck(self.questions, "submitClicked").map(function(option) {
					return ko.toJS(option);
				}));


				if (everyQ) {
					showNav = true;
					scrollPageThisValue(400);

					var answerList = _.pluck(self.questions, "questionResult").map(function(s){
						return s();
					});
					var trues = _.partition(answerList)[0];
					var percentage = Math.round((100 / answerList.length) * trues.length);

					var passed = percentage >= thisPageData.passPercent;

					var resultText = "";

					if (passed) {
						resultText = thisPageData.assessmentPass.replace(/{%}/g, percentage).replace(/{qu}/g, trues.length);
						thisTopic.complete(true);
					} else {
						resultText = thisPageData.assessmentFail.replace(/{%}/g, percentage).replace(/{qu}/g, trues.length);
					}
					thisPageData.passed = passed;
					thisPageData.allowNext(true);
					thisTopic.assessmentPassed = passed;
					thisTopic.score = percentage;

					var resultsElem = $elem(".assessment_results");

					if(!passed && thisPageData.assessmentRetake)
					{
						resultText += thisPageData.assessmentRetake;
					}
					resultsElem.show();
					resultsElem.html(resultText);
				}
			};
		}

		var viewmodel = new questionModel();

		ko.applyBindings(viewmodel, $(Section)[0]);

		thisPageData.activate = function() {
			// allowPrev(false);
			// if (!thisPageData.allowNext()) {
			// 	 $(".home_btn").hide();
			// }
		};

		thisPageData.deactivate = function() {

		};
	};
});
