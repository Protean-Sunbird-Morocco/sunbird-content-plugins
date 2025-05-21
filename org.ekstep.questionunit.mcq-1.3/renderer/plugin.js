/**
 * Question Unit plugin to render a MCQ question
 * @class org.ekstep.questionunit.mcq
 * @extends org.ekstep.contentrenderer.questionUnitPlugin
 * @author Manoj Chandrashekar <manoj.chandrashekar@tarento.com>
 */
org.ekstep.questionunitmcq = {};
org.ekstep.questionunitmcq.RendererPlugin = org.ekstep.contentrenderer.questionUnitPlugin.extend({
  _type: 'org.ekstep.questionunit.mcq',
  _isContainer: true,
  _render: true,
  _selectedanswere: undefined,
  _constant: {
    verticalLayout:'Vertical',
    horizontalLayout: 'Horizontal',
    gridLayout: "Grid",
    mcqParentDiv: "#qs-mcq-template",
    mcqSelectOption: ".mcq-option-value",
    optionSelectionUI: "qsselectedopt",
  },
  _defaultImageIcon: "default-image.png",
  _defaultAudioIcon: "audio.png",
  _selectedIndices: undefined,
  _selectedIndex: undefined,
  _lastAudio: undefined,
  _currentAudio: undefined,
  setQuestionTemplate: function () {
    this._question.template = MCQController.loadTemplateContent(); // eslint-disable-line no-undef
    MCQController.initTemplate(this);// eslint-disable-line no-undef
  },
  /**
   * Listen show event
   * @memberof org.ekstep.questionunit.mcq
   * @param {Object} event from question set.
   */
  preQuestionShow: function (event) {
    this._selectedIndices = [];
    this._super(event);
    if (this._question.state && _.has(this._question.state, 'val')) {
      this._question.data.options = this._question.state.options;
    }else{
      if (this._question.config.isShuffleOption) {
        this._question.data.options = _.shuffle(this._question.data.options);
      }
    }
  },
  /**
   * Listen event after display the question
   * @memberof org.ekstep.questionunit.mcq
   * @param {Object} event from question set.
   */
  postQuestionShow: function () {
    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.ASSESS);// eslint-disable-line no-undef
    MCQController.renderQuestion(); // eslint-disable-line no-undef

    
    if (this._question.state && _.has(this._question.state, 'val')) {
      // this._selectedIndices = this._question.state.val;
        this._selectedIndices = this._question.state.val;
        var selectedIndices = Array.isArray(this._selectedIndices) ? this._selectedIndices : [this._selectedIndices];
        var layout = this._question.config.layout;
        
        _.each($(".org-ekstep-questionunit-mcq-option-element"), function(optionElement, index) {
            // Check if current index exists in the selectedIndices array
            if (selectedIndices.includes(index)) {
                MCQController[layout.toLowerCase()].optionStyleUponClick(optionElement);
            }
        });
    } else {
        this._selectedIndices = [];
    }
},
  /**
   * Question evalution
   * @memberof org.ekstep.questionunit.mcq
   * @param {Object} event from question set.
   */
  evaluateQuestion: function (event) {
    var instance = this;
    var callback = event.target;
    var correctAnswer = false, telValues = {}, result = {}, option;
    option = MCQController.pluginInstance._question.data.options; // eslint-disable-line no-undef

    // Get all correct answer indices
    var correctIndices = option.map((opt, index) => opt.isCorrect ? index : null).filter(index => index !== null);
    // Check if selected indices match all correct indices
    var selectedIndices = MCQController.pluginInstance._selectedIndices;

    correctAnswer = _.isEqual(selectedIndices.sort(), correctIndices.sort());

    // Prepare telemetry values for each selected index
    selectedIndices.forEach(function (selectedIndex) {
        var selectedAnsData = option[selectedIndex];
        telValues['option' + selectedIndex] = selectedAnsData?.image.length > 0 ? selectedAnsData?.image : selectedAnsData?.text;
    });

    result = {
        eval: correctAnswer,
        state: {
            val: _.isEmpty(selectedIndices)? undefined:_.uniq(selectedIndices),  // Store the array of selected indices
            options: option // eslint-disable-line no-undef
        },
        score: correctAnswer ? MCQController.pluginInstance._question.config.max_score : 0, // eslint-disable-line no-undef
        params: instance.getTelemetryParams(),
        values: instance.getTelemetryResValues(),
        type: "mcq"
    };
    if (_.isFunction(callback)) {
        callback(result);
    }
},
  getTelemetryParams: function () {
    // Any change in the index value affects resvalues as well
    var instance = this;
    var params = [], questionData = MCQController.pluginInstance._question.data;
    var correctAnsIndex = [],answer = {};
    questionData.options.forEach(function (option,key) { // eslint-disable-line no-undef
      var temp = {};
      temp[key+1] = instance.getTelemetryParamsValue(option);
      if(option.isCorrect) correctAnsIndex.push((key+1).toString());
      params.push(temp);
    });
    answer.correct = correctAnsIndex;
    params.push({'answer':JSON.stringify(answer)});
    return params;
  },
  getTelemetryResValues: function() {
    var resValues = [];
    var selectedIndices = MCQController.pluginInstance._selectedIndices;
    
    if (!_.isUndefined(selectedIndices) && Array.isArray(selectedIndices)) {
      selectedIndices.forEach(function(selectedIndex) {
        var value = {};
        value[selectedIndex + 1] = this.getTelemetryParamsValue(MCQController.pluginInstance._question.data.options[selectedIndex]);
        resValues.push(value);
      }, this);
    }
      
    return resValues;
  },
  /**
   * provide media url to audio image
   * @memberof org.ekstep.questionunit.mcq
   * @returns {String} url.
   * @param {String} icon from question set.
   */
  getDefaultAsset: function (icon) {
    //In browser and device base path is different so we have to check
    if (isbrowserpreview) {// eslint-disable-line no-undef
      return this.getAssetUrl(org.ekstep.pluginframework.pluginManager.resolvePluginResource(this._manifest.id, this._manifest.ver, "renderer/assets/" + icon));
    }
    else {
      //static url
      return this.getAssetUrl("/content-plugins/" + this._manifest.id + "-" + this._manifest.ver + "/renderer/assets/" + icon);
    }
  },
  /**
  * provide media url to asset
  * @memberof org.ekstep.questionunit.mcq
  * @param {String} url from question set.
  * @returns {String} url.
  */
  getAssetUrl: function (url) {
    if (isbrowserpreview) {// eslint-disable-line no-undef
      return url;
    }
    else {
      return 'file:///' + EkstepRendererAPI.getBaseURL() + url;
    }
  },
  /**
   * onclick option the function call
   * @memberof org.ekstep.questionunit.mcq
   * @param {event} event from question set.
   * @param {Integer} index from question set.
   */
  onOptionSelected: function (event, index) {
    // this._selectedIndices = index;
    var telValues = {};
    var selected_indices = [];

    index.forEach(index => {
        // Toggle the index in the selectedIndices array
        var selectedIndexPosition = selected_indices.indexOf(index);
        if (selectedIndexPosition > -1) {
            // If index is already selected, remove it
            selected_indices.splice(selectedIndexPosition, 1);
        } else {
            // If index is not selected, add it
            selected_indices.push(index);
        }
    });

    // Only add the most recently appended index to telemetry values
    if (selected_indices.length > 0) {
        var lastSelectedIndex = selected_indices[selected_indices.length - 1];
        var lastSelectedValue = this._question.data.options[lastSelectedIndex];
        telValues['option' + lastSelectedIndex] = lastSelectedValue?.image.length > 0 ? lastSelectedValue?.image : lastSelectedValue?.text.replace(/(<([^>]+)>)/ig, '').replace(/\n/g, '').trim();
    }

    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.RESPONSE, { // eslint-disable-line no-undef
        "type": "MCQ",
        "values": [telValues]
    });
  },
  logTelemetryInteract: function (event) {
    if (event != undefined) QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.TOUCH, { // eslint-disable-line no-undef
      type: QSTelemetryLogger.EVENT_TYPES.TOUCH, // eslint-disable-line no-undef
      id: event.target.id
    });
  }
});
//# sourceURL=questionunitMCQPlugin.js
