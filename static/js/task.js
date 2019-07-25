//  CONTROL PANEl
var debug = true; // debug mode (true to run without psiTurk, false to run with psiTurk)
var phase1 = true; // staircasing phase
var phase2 = true; // cue learning phase
var phase3 = true; // practice cued task switching phase
var phase31 = true; //practice block 1
var phase32 = true; //practice block 2
var phase4 = true; // experiment cued task switching phase

// TASK SEQUENCE and PRACTICE GENERATION
// 1: frequency + miniblock size 4-6 + 50% incongruency
// 2: frequency + miniblock size 1  + 50% incongruency
// 3: frequency + miniblock size 1 + 25% incongruency
var manipulation = 1;

var practice_miniblocks; // number of miniblocks to extract for each practice block
if(manipulation == 1){
  practice_miniblocks = 6; // range: 1-66 for manipulation 1
}else{
  practice_miniblocks = 25; // range: 1-130 for manipulation 2 and 3
}

// DOT MOTION TIMING
var cue_duration = 700;
var preparation_duration = 600;
var trial_duration = 1500;
var feedback_duration = 700;

// CUE LEARNING TIMING
var cue_preparation_duration = 700;
var cue_stimulus_duration = 2500;
var cue_feedback_duration = 1500;

//  OTHER PARAMETERS
var constant_timing = true; // add remaining trial duration to feedback_duration
var dynamic_trial_duration = false; // adapt duration of stimulus to average RT of participant in practice block 2
var fixation_cross = true; // whether you want a fixation cross in the preparation phase
var training_feedback = true; // feedback during training phase (3)
var experiment_feedback = true; // feedback during experiment phase (4)

/* load psiturk */
if(!debug){
  var psiturk = new PsiTurk(uniqueId, adServerLoc, mode);
}else{ // in debug mode, set the condition and counterbalance
  condition = 1;
  counterbalance = 1;
}

//The main timeline to be fed into jsPsych.init
var timeline = [];

// Setting up counterbalancing conditions
// compute the counterbalance conditions based on counterbalance assignment
var p1_cb, p2_cb;
var num_sequences = 32; // number of sequences we want to use
if(counterbalance < num_sequences / 4){
  p1_cb = 0;
  p2_cb = 0;
}else if(counterbalance < num_sequences / 2){
  p1_cb = 1;
  p2_cb = 0;
}else if(counterbalance < (num_sequences / 4) * 3){
  p1_cb = 0;
  p2_cb = 1;
}else { // if(counterbalance < num_sequences)
  p1_cb = 1;
  p2_cb = 1;
}

// Loading trial data files synchronously
var experiment_sequence = (parseInt(counterbalance) + 1); // compute the sequence number from counterbalance assignment
var practice_sequence = experiment_sequence % num_sequences + 1 // for the practice sequence, select the next sequence number (wraps around)

// generate the proper file names for the practice (phase 3) and test (phase 4) data
if(manipulation == 1){
  manipulation ='frequency';
}else if(manipulation == 2){
  manipulation ='frequency_miniBlockSize1';
}else if(manipulation == 3){
  manipulation ='frequency_miniBlockSize1_congruency75';
}

var experiment_url = "/static/trial_data/" + manipulation + "/effortGroup_" + (parseInt(condition) + 1) + "_sequence" + experiment_sequence + ".csv";
var practice_url = "/static/trial_data/" + manipulation + "/effortGroup_" + (parseInt(condition) + 1) + "_sequence" + practice_sequence + ".csv";

$.ajax({
    url: practice_url, // load the practice file (phase 3)
    async: false,
    dataType: "text",
    success: function (response) {
      processTrialData(response, 'practice');
    }
 });

 $.ajax({
     url: experiment_url, // load the test file (phase 4)
     async: false,
     dataType: "text",
     success: function (response) {
       processTrialData(response, 'experiment');
     }
  });

// This function reads into the trial sequence csv files
//    option: practice = phase 3, experiment = phase 4
//    allText: raw text from csv files loaded above
var prc_lines_1, prc_lines_2, exp_lines_1, exp_lines_2;
function processTrialData(allText, option) {
    var allTextLines = allText.split(/\r\n|\n/);

    // extract the headers into the respective variable
    if(option == 'practice'){
      prc_headers = allTextLines[0].split(',');
      prc_lines_1 = [];
      prc_lines_2 = [];
    }else if(option == 'experiment'){
      exp_headers = allTextLines[0].split(',');
      exp_lines_1 = [];
      exp_lines_2 = [];
    }

    // loop through each line (trial) in the sequence
    for (var i=1; i<allTextLines.length; i++) {
        var data = allTextLines[i].split(',');
        var miniblock = parseInt(data[10])
        var block = parseInt(data[11])

        if(option == 'practice'){
          if (data.length == prc_headers.length){

            if(miniblock <= practice_miniblocks){ // extract first half of miniblocks
              var tarr = [];
              // loop through the individual elements on each line (trial)
              for (var j=0; j<prc_headers.length; j++) {
                  tarr.push(data[j]);
              }
              prc_lines_1.push(tarr);
            }else if(miniblock <= practice_miniblocks * 2){ // extract second half of miniblocks
              var tarr = [];
              // loop through the individual elements on each line (trial)
              for (var j=0; j<prc_headers.length; j++) {
                  tarr.push(data[j]);
              }
              prc_lines_2.push(tarr);
            }
          }
        }else if(option == 'experiment'){
          if (data.length == exp_headers.length) {
            if(block == 1){
              var tarr = [];
              // loop through the individual elements on each line (trial)
              for (var j=0; j<exp_headers.length; j++) {
                  tarr.push(data[j]);
              }
              exp_lines_1.push(tarr);
            }else if(block == 2){ // extract second half of miniblocks
              var tarr = [];
              // loop through the individual elements on each line (trial)
              for (var j=0; j<exp_headers.length; j++) {
                  tarr.push(data[j]);
              }
              exp_lines_2.push(tarr);
            }
          }
       }
    }
}

// fullscreen mode
if(!debug){
  timeline.push({
    type: 'fullscreen',
    fullscreen_mode: true,
    message: '<p>The experiment will swap to full screen mode when you press the button below</p>',
    button_label: 'Start Experiment'
  });
}

// Generates template for cue stimulus
//    phase: "3", "3.1", "3.2", or "4"
//    cue_shape: "circle", "triangle", "diamond", or "square"
var cue = {
  type: 'html-keyboard-response',
  stimulus: '',
  choices: jsPsych.NO_KEYS,
  trial_duration: cue_duration, //Duration of each cue in ms

  data: jsPsych.timelineVariable('data'), //additional data tagged for consistency

  on_start: function(cue){
    if(typeof cue.data.cue_shape === "undefined"){ //by default, show a circle if no cue shape is inputted
      cue.stimulus = "<div style='float: center;'><img src='/static/images/circle.png'></img></div>";
    }else{
      if(cue.data.phase == '3'){
        cue.stimulus = "<div style='width: 700px;'>" +
           "<div style='float: center;'><img src='/static/images/" + cue.data.cue_shape + ".png'></img></div>" +
        "(this cues a " + cue.data.task + " task)</div>"; // extra feedback

        cue.trial_duration = cue.trial_duration + 1500; //extend the cue duration if it's still the practice phase

      }else if(cue.data.phase == '3.1'){
        cue.stimulus = "<div style='width: 700px;'>" +
           "<div style='float: center;'><img src='/static/images/" + cue.data.cue_shape + ".png'></img></div>" +
        "(this cues a " + cue.data.task + " task)</div>"; // extra feedback

        cue.trial_duration = cue.trial_duration + 700; //extend the cue duration if it's still the practice phase
      }else{ // phase 3.2 or 4
        cue.stimulus = "<div style='float: center;'><img src='/static/images/" + cue.data.cue_shape + ".png'></img></div>";
      }
    }
  }
}

// Generates template for preparation stimulus
var preparation = {
  type: 'html-keyboard-response',
  stimulus: '',
  choices: jsPsych.NO_KEYS,
  trial_duration: preparation_duration,

  data: jsPsych.timelineVariable('data'),

  on_start: function(preparation){
    if(fixation_cross){
      preparation.prompt = '<div style="font-size:60px; color:black;">+</div>';
    }else{
      preparation.prompt = '';
    }
  }
}

// Generates stimulus, more details in plugin code
//    phase: "1.1", "1.2", "3.1", "3.2", or "4"
//    correct_choice: 'a' or 'l'
//    coherent_direction: 'up' or 'down'
//    majority_color: 'blue' or 'red'
//    majority_color: 'red' or 'blue'
//    motionCoherence: percent of dots moving in coherent direction, range 0 to 1
//    colorCoherence: percent of dots in majority color, range 0 to 1
//    trial_duration: duration of each trial in ms
//    response_ends_trial: whether response ends trial or not
//    dot_timeout: duration after which dots dissapear in ms, except if value = 0
var stimulus = {
  type: "RDK",
  choices: ['a', 'l'], //Choices available to be keyed in by participant
  correct_choice: jsPsych.timelineVariable('correct_choice'),
  coherent_direction: jsPsych.timelineVariable('coherent_direction'),
  majority_color: jsPsych.timelineVariable('majority_color'),
  minority_color: jsPsych.timelineVariable('minority_color'),

  motion_coherence:  jsPsych.timelineVariable('motion_coherence'),
  color_coherence: jsPsych.timelineVariable('color_coherence'),

  trial_duration: jsPsych.timelineVariable('trial_duration'),
  response_ends_trial: jsPsych.timelineVariable('response_ends_trial'),
  dot_timeout: jsPsych.timelineVariable('dot_timeout'),
  text: jsPsych.timelineVariable('text'),

  data: jsPsych.timelineVariable('data'),

  on_start: function(stimulus){
    stimulus.motion_coherence = currentMotionCoherence;
    stimulus.color_coherence = currentColorCoherence;

    // if(stimulus.data.phase == '1.1' || stimulus.data.phase == '1.2'){
    //   stimulus.motion_coherence = currentMotionCoherence;
    //   stimulus.color_coherence = currentColorCoherence;
    // }else{
    //   // increase the coherence by the minimum coherence for all phases other than the staircasing procedure
    //   stimulus.motion_coherence = currentMotionCoherence + minMotionCoherence;
    //   stimulus.color_coherence = currentColorCoherence + minColorCoherence;
    // }

    // dynamically adapt trial duration to average RT of participant during block 2
    if(stimulus.data.phase == '4' && dynamic_trial_duration){
      stimulus.trial_duration = currentTrialDuration;
    }
  },

  on_finish: function(stimulus){
    var data = jsPsych.data.get().last().values()[0];

    if(stimulus.phase == '1.1'){
      // update coherence for staircasing
      if(typeof data.correct === "undefined"){
        currentMotionCoherence = currentMotionCoherence + incorrectDelta;
      }else if(data.correct){
        if(currentMotionCoherence - correctDelta > minMotionCoherence){
          currentMotionCoherence = currentMotionCoherence - correctDelta;
        }else{
          currentMotionCoherence = minMotionCoherence
        }
      }else{
        if(currentMotionCoherence < maxCoherence){
          if(currentMotionCoherence + incorrectDelta >= maxCoherence){
            currentMotionCoherence = maxCoherence;
          }else{
            currentMotionCoherence = currentMotionCoherence + incorrectDelta;
          }
        }
      }
    }else if(stimulus.phase == '1.2'){
      // update coherence for staircasing
      if(typeof data.correct === "undefined"){
        currentColorCoherence = currentColorCoherence + incorrectDelta;
      }else if(data.correct){
        if(currentColorCoherence - correctDelta > minColorCoherence){
          currentColorCoherence = currentColorCoherence - correctDelta;
        }else{
          currentColorCoherence = minColorCoherence
        }
      }else{
        if(currentColorCoherence < maxCoherence){
          if(currentColorCoherence + incorrectDelta >= maxCoherence){
            currentColorCoherence = maxCoherence;
          }else{
            currentColorCoherence = currentColorCoherence + incorrectDelta;
          }
        }
      }
    }

  }
}

// Generates template for feedback stimulus
//    phase: "1.1", "1.2", "3.1", "3.2", or "4"
var feedback = {
  type: 'html-keyboard-response',
  stimulus: '',
  choices: jsPsych.NO_KEYS,
  trial_duration: feedback_duration,

  data: jsPsych.timelineVariable('data'),

  on_start: function(feedback){
    // get data from previous trial
    var data = jsPsych.data.get().last().values()[0];

    // HTML feedback building blocks
    var correct = '<div style="color:white;font-size:30px"; class = center-text><b>Correct</b></div>';
    var incorrect = '<div style="color:white;font-size:30px"; class = center-text><b>Incorrect</b></div>'
    var respond_faster = '<div style="color:white;font-size:30px"; class = center-text><b>Respond Faster</b></div>';
    var filler = '<p style="color:grey;font-size:12px">Filler</p>';

    // basic feedback
    if(fixation_cross){
      feedback.prompt = '<div style="font-size:60px; color:black;">+</div>';
    }else{
      feedback.prompt = '';
    }

    // decrease number of trials left to display
    if(data.phase == '1.1'){
      motionTrials = motionTrials - 1
    }else if(data.phase == '1.2'){
      colorTrials = colorTrials - 1;
    }

    // check if feedback is turned on in training and experiment phases
    if(data.phase == '1.1' || data.phase == '1.2' || (training_feedback && data.phase == '3.1') || (training_feedback && data.phase == '3.2') || (experiment_feedback && data.phase == '4')){
      if(data.correct){
        if(data.phase == '1.1'){
          feedback.prompt = filler + correct + '<p style="color:white;">'+ motionTrials +' trials left</p>';
        }else if(data.phase == '1.2'){
          feedback.prompt = filler + correct + '<p style="color:white;">'+ colorTrials +' trials left</p>';
        }else{
          feedback.prompt = filler + correct + filler;
        }
      }else if(!data.correct){
        if(data.rt == -1){ // no response
          if(data.phase == '4'){
            feedback.prompt = filler + respond_faster + filler;
          }else if (data.phase == '3.1' || data.phase == '3.2'){
            feedback.trial_duration = feedback.trial_duration + 500;
            feedback.prompt = filler + respond_faster + "<p>Do not wait for the '?', respond as soon as you can.</p>";
          }else{
            feedback.trial_duration = feedback.trial_duration + 500;
            feedback.prompt = filler + respond_faster + "<p>Respond as fast as you can when you see the '?'.</p>";
          }
        }else if(data.task == 'motion'){ // incorrect motion task
          if(data.phase == '4'){
            feedback.prompt = filler + incorrect + filler;
          }else if(data.phase == '3.2'){
            feedback.trial_duration = feedback.trial_duration + 1000;
            feedback.prompt = filler + incorrect + '<p>This was a motion task.</p>';
          }else{
            feedback.trial_duration = feedback.trial_duration + 1500;
            if(data.correct_choice == 'a'){
              feedback.prompt = filler + incorrect + '<p>Press A for mostly upward motion.</p>';
            }else if(data.correct_choice == 'l'){
              feedback.prompt =  filler + incorrect + '<p>Press L for mostly downward motion.</p>';
            }
          }
        }else if(data.task == 'color'){ // incorrect color task
          if(data.phase == '4'){
            feedback.prompt = filler + incorrect + filler;
          }else if(data.phase == '3.2'){
            feedback.trial_duration = feedback.trial_duration + 1000;
            feedback.prompt = filler + incorrect + '<p>This was a color task.</p>';
          }else{
            feedback.trial_duration = feedback.trial_duration + 1500;
            if(data.correct_choice == 'a'){
              feedback.prompt =  filler + incorrect + '<p>Press A for mostly blue dots.</p>';
            }else if(data.correct_choice == 'l'){
              feedback.prompt =  filler + incorrect + '<p>Press L for mostly red dots.</p>';
            }
          }
        }
      }
    }

    if(data.phase == '3.1' || data.phase == '3.2' || data.phase == '4'){
      // dynamically change feedback duration
      if(data.response_ends_trial && constant_timing && data.rt != -1 && data.rt != null){
        feedback.trial_duration += Math.floor(data.trial_duration - data.rt);
      }
    }

  }
}

// --------------------
// FIRST PHASE: staircasing phase
// --------------------
var numTrials = 100;
var motionTrials = numTrials;
var colorTrials = numTrials;
var currentMotionCoherence = 0.35; // starting coherence
var currentColorCoherence = 0.35; // starting coherence
var incorrectDelta = 0.0566;
var correctDelta = 0.01;
var minMotionCoherence = 0.005;
var minColorCoherence = 0.005;
var maxCoherence = 0.7;

var stim_example = {
  timeline: [stimulus],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'blue',
    minority_color: 'red',
    trial_duration: 3000,
    data: {
      task: 'motion'
    }
  }],
}

var down_example = {
  timeline: [stimulus],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Moving Down (Press L)',
    trial_duration: 3000,
    data: {
      task: 'motion'
    }
  }],
}
var up_example = {
  timeline: [stimulus],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'up',
    cmajority_color: 'blue',
    minority_color: 'red',
    text: 'Moving Up (Press A)',
    trial_duration: 3000,
    data: {
      task: 'motion'
    }
  }],
}
var red_example = {
  timeline: [stimulus],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'red',
    minority_color: 'blue',
    text: 'Mostly Red (Press L)',
    trial_duration: 3000,
    data: {
      task: 'color'
    }
  }],
}
var blue_example = {
  timeline: [stimulus],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'down',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Mostly Blue (Press A)',
    trial_duration: 3000,
    data: {
      task: 'color'
    }
  }],
}

var motion_stimulus = [
  {// Motion trial 1
    correct_choice: 'l', //the correct answer
    coherent_direction: 'down', //the coherent direction
    majority_color: 'blue',
    minority_color: 'red',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'motion',
      phase: '1.1'
    }
  },
  {// Motion trial 2
    correct_choice: 'a', //the correct answer
    coherent_direction: 'up', //the coherent direction
    majority_color: 'red',
    minority_color: 'blue',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'motion',
      phase: '1.1'
    }
  },{// Motion trial 3
    correct_choice: 'l', //the correct answer
    coherent_direction: 'down', //the coherent direction
    majority_color: 'red',
    minority_color: 'blue',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'motion',
      phase: '1.1'
    }
  },
  {// Motion trial 4
    correct_choice: 'a', //the correct answer
    coherent_direction: 'up', //the coherent direction
    majority_color: 'blue',
    minority_color: 'red',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'motion',
      phase: '1.1'
    }
  }
]

var color_stimulus = [
  {// Color trial 1
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'red',
    minority_color: 'blue',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'color',
      phase: '1.2'
    }
  },
  {// Color trial 2
    correct_choice: 'a',
    coherent_direction: 'up',
    majority_color: 'blue',
    minority_color: 'red',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'color',
      phase: '1.2'
    }
  },{// Color trial 3
    correct_choice: 'l',
    coherent_direction: 'up',
    majority_color: 'red',
    minority_color: 'blue',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'color',
      phase: '1.2'
    }
  },
  {// Color trial 4
    correct_choice: 'a',
    coherent_direction: 'down',
    majority_color: 'blue',
    minority_color: 'red',
    trial_duration: 3000,
    dot_timeout: 1500,
    data: {
      task: 'color',
      phase: '1.2'
    }
  }
]

/* define introduction block */
var introduction = {
  type: 'instructions',
  pages: [
      '<div style="font-size:36px">Welcome to the dot-motion experiment!</div>' +
      '<div align="left"><p>There will be four phases:</p>' +
      '<ul><li><b>Phase 1:</b> you will get to know the color and motion tasks.</li>' +
      '<li><b>Phase 2:</b> you will learn whether a cue indicates color or motion.</li>' +
      '<li><b>Phase 3:</b> you will practice swapping between color or motion tasks.</li>' +
      '<li><b>Phase 4:</b> you will be cued to swap between color or motion tasks.</p></li></ul></div>' +
      "<p style='font-size:20px'><font color='aqua'>FAQ: If I've done this study before, can I do it again? ----- YES, you can!</font></p>" +
      "<div style='font-size:24px'>You can earn a <b>bonus payment</b> of up to <u><b>$3.00</b></u> </br> " +
      "if you respond quickly and accurately.</br>(more details in Phase 3)</div></br>" +
      'The experiment will take approximately 50 minutes to complete.'
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var survey_demographics_gender = {
  type: 'survey-multi-choice',
  preamble: "Before we continue, we need to collect these a few pieces of information about you:",
  questions: [
    {prompt: "What is your gender?", options:  ["Male", "Female", "Other"], required: true, horizontal: false,}
  ],
};


// defining groups of questions that will go together.
var survey_demographics_age = {
  type: 'survey-text',
  questions: [{prompt: "How old are you?"},],
  preamble: "Before we continue, we need to collect these a few pieces of information about you:",
};

var introduction2 = {
  type: 'instructions',
  pages: [
      "<div style='font-size:32px'>Welcome to the <strong>Phase 1</strong>.</div></br>" +
      "<div style='font-size:24px'>Let's learn about the <u>stimulus</u>.</div>" +
      "<p>A swarm of red and blue dots will be moving on the screen.</p>"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

/* define instructions block */
var instructions_mc = {
  type: 'instructions',
  pages: ["<p>Now that you've seen the stimulus, there are two sets of tasks:</p>"+
          "<div style='font-size:24px'><strong><u>Motion</u></strong> tasks and <strong><u>Color</u></strong> tasks </div>"],
  show_clickable_nav: true,
  post_trial_gap: 1000
};


/* define instructions block */
var instructions_motion = {
  type: 'instructions',
  pages: ["<div style='font-size:32px'>Motion Instructions</div>" +
      "<p>In the <strong>motion</strong> task, there will be two kinds of moving colored dots:</br></br>" +
      "1. <b><u>'Random'</u></b> dots move in <u>random directions</u>.</br>2. <b><u>'Coherent'</u></b> dots move either <u>UP</u> or <u>DOWN</u>. </br>" +
      "<p style='font-size:24px'> <b>The task <font color='#FA8072'>is to figure out whether the </font>coherent dots <font color='#FA8072'>are going</font> UP or DOWN.</b></p>",
      "If the <u>coherent</u> dots are moving <strong>upward</strong>,</br>" +
        "press the <u>A key</u>.</br></br><img src='/static/images/up.gif'></img>" +
        "</br><strong>Press A for coherent dots moving UP</strong>",
      "If the <u>coherent</u> dots are going <strong>downward</strong>,</br>"+
        "press the <u>L key</u>.</br></br><img src='/static/images/down.gif'></img>" +
        "</br><strong>Press L for coherent dots moving DOWN</strong>",

      "<div style='font-size:32px'>Motion Instructions Summary</div>" +
      "<p>In the <strong>motion</strong> task, there will be two kinds of moving colored dots:</br></br>" +
      "1. <b><u>'Random'</u></b> dots move in <u>random directions</u>.</br>2. <b><u>'Coherent'</u></b> dots move either <u>UP</u> or <u>DOWN</u>. </br>" +
      "<p style='font-size:24px'> <b>The task <font color='#FA8072'>is to figure out whether the </font>coherent dots <font color='#FA8072'>are going</font> UP or DOWN.</b></p>" +
      "<div class='row'>" +
        "<div class='column' style='float:center; border-style: solid; border-right: 0;'>If coherent dots are going <strong>UP</strong>,</br>" +
        "press the <u>A key</u>.</br></br><img src='/static/images/up.gif'></img>" +
        "</br><strong>Press A for coherent dots moving UP</strong></div>" +
        "<div class='column' style='float:center; border-style: solid;'>If coherent dots are going <strong>DOWN</strong>,</br>"+
        "press the <u>L key</u>.</br></br><img src='/static/images/down.gif'></img>" +
        "</br><strong>Press L for coherent dots moving DOWN</strong></div>" +
      "</div></br>Press next for an example of each."],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_color = {
  type: 'instructions',
  pages: ["<div style='font-size:32px'>Color Instructions</div>" +
  "<p>In the <strong>color</strong> task, there will be moving colored dots.</p>" +
  "<p style='font-size:24px'><font color='#FA8072'><b>The task</font><font color='#FA8072'> is to figure out whether the dots are </font>mostly <u>BLUE or RED</u>.</b></p>",
      "If most of the dots are <strong>blue</strong>,</br>" +
        "press the <u>A key</u>.</br></br><img src='/static/images/blue.gif'></img>" +
        "</br><strong>Press A for mostly blue</strong>",
      "If most of the dots are <strong>red</strong>,</br>"+
        "press the <u>L key</u>.</br></br><img src='/static/images/red.gif'></img>" +
        "</br><strong>Press L for mostly red</strong>",
    "<div style='font-size:32px'>Color Instructions Summary</div>" +
    "<p>In the <strong>color</strong> task, there will be moving colored dots.</p>" +
    "<p style='font-size:24px'><font color='#FA8072'><b>The task</font><font color='#FA8072'> is to figure out whether the dots are </font>mostly <u>BLUE or RED</u>.</b></p>" +
      "<div class='row'>" +
        "<div class='column' style='float:center; border-style: solid; border-right: 0;'>If most of the dots are <strong>blue</strong>,</br>" +
        "press the <u>A key</u>.</br></br><img src='/static/images/blue.gif'></img>" +
        "</br><strong>Press A for mostly blue</strong></div>" +
        "<div class='column' style='float:center; border-style: solid;'>If most of the dots are <strong>red</strong>,</br>"+
        "press the <u>L key</u>.</br></br><img src='/static/images/red.gif'></img>" +
        "</br><strong>Press L for mostly red</strong></div>" +
      "</div></br>Press next for an example of each."],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_block = {
  type: 'instructions',
  pages: ["<div style='font-size:32px'>Block Instructions</div></br>" +
      "You will now get a series of trials called 'blocks', for both motion and color tasks.</br></br>" +
      "The dots are going to show up for 1.5 seconds and then disappear</br>" +
      "and be replaced by a '?'. You can only respond when you see the '?'.</br></br>" +
      "You only have about 1.5 second to respond on each trial.</br></br>"+
      "Press next to see the instructions for the motion or color block!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_motion_block = {
  type: 'instructions',
  pages: ["<div style='font-size:32px'>Motion Block</div>" +
      "<p style='font-size:24px'>In this block, you will focus on MOTION.</p>" +
      "There will be around "+numTrials+" motion tasks.</br></br>" +
      "As you get more trials correct, they will get harder. Try to reach</br>" +
      "your highest performance level and stay at that for a while.</br></br>" +
      "Remember:</br></br>"+
      "You can only respond when you see the '?'.</br></br>" +
      "A key = coherent dots UP </br>" +
      "L key = coherent dots DOWN </br></br>" +
      "Press next to begin the motion block!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_color_block = {
  type: 'instructions',
  pages: ["<div style='font-size:32px'>Color Block</div>" +
      "<p style='font-size:24px'>In this block, you will focus on COLOR.</p>" +
      "There will be around "+numTrials+" color tasks.</br></br>" +
      "As you get more trials correct, they will get harder. Try to reach</br>" +
      "your highest performance level and stay at that for a while.</br></br>" +
      "Remember:</br></br>"+
      "You can only respond when you see the '?'.</br></br>" +
      "A key = mostly BLUE </br>" +
      "L key = mostly RED </br></br>" +
      "Press next to begin the COLOR block!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

// counterbalance showing motion or color first
if(p1_cb % 2 == 0 && phase1){
  timeline.push(introduction);
  timeline.push(survey_demographics_gender);
  timeline.push(survey_demographics_age);
  timeline.push(introduction2);
  timeline.push(stim_example);
  timeline.push(instructions_mc);
  timeline.push(instructions_motion);
  timeline.push(down_example);
  timeline.push(up_example);
  timeline.push(down_example);
  timeline.push(up_example);

  timeline.push(instructions_color);
  timeline.push(red_example);
  timeline.push(blue_example);
  timeline.push(red_example);
  timeline.push(blue_example);

  timeline.push(instructions_block);

  timeline.push(instructions_motion_block);

  for(i = 0; i < numTrials; i++){
    var stim_sequence = {
      timeline: [preparation, stimulus, feedback],
      timeline_variables: motion_stimulus,
      randomize_order: true,
      repetitions: 1,
      sample: {
          type: "without-replacement",
          size: 1
        }
      }
    timeline.push(stim_sequence);
  }

  timeline.push(instructions_color_block);

  for(i = 0; i < numTrials; i++){
    var stim_sequence = {
      timeline: [preparation, stimulus, feedback],
      timeline_variables: color_stimulus,
      randomize_order: true,
      repetitions: 1,
      sample: {
          type: "without-replacement",
          size: 1,
              }
      }
    timeline.push(stim_sequence);
  }
}else if(p1_cb % 2 == 1 && phase1){
  timeline.push(introduction);
  timeline.push(survey_demographics_gender);
  timeline.push(survey_demographics_age);
  timeline.push(introduction2);
  timeline.push(stim_example);
  timeline.push(instructions_mc);
  timeline.push(instructions_color);
  timeline.push(red_example);
  timeline.push(blue_example);
  timeline.push(red_example);
  timeline.push(blue_example);

  timeline.push(instructions_motion);
  timeline.push(down_example);
  timeline.push(up_example);
  timeline.push(down_example);
  timeline.push(up_example);

  timeline.push(instructions_block);


  timeline.push(instructions_color_block);

  for(i = 0; i < numTrials; i++){
    var stim_sequence = {
      timeline: [stimulus, feedback],
      timeline_variables: color_stimulus,
      randomize_order: true,
      repetitions: 1,
      sample: {
          type: "without-replacement",
          size: 1,
              }
      }
    timeline.push(stim_sequence);
  }

  timeline.push(instructions_motion_block);

  for(i = 0; i < numTrials; i++){
    var stim_sequence = {
      timeline: [stimulus, feedback],
      timeline_variables: motion_stimulus,
      randomize_order: true,
      repetitions: 1,
      sample: {
          type: "without-replacement",
          size: 1
        }
      }
    timeline.push(stim_sequence);
  }
}

// --------------------
// SECOND PHASE: cue learning phase
// --------------------
var trial_counter = 0;
if (trial_counter == 0) {var sum = 0;}
var response_array = [];
var end_phase = false;
var maxTrials = 100;

var shapes = [["circle","triangle"],["diamond","square"]];

if(p2_cb % 2 == 0){
  shapes = shapes.reverse();
}

var motion_cues = {
  1: shapes[0][0],
  2: shapes[0][1]
};

var color_cues = {
  1: shapes[1][0],
  2: shapes[1][1]
};

var instructions_cue = {
  type: 'instructions',
  pages: [
      '<div style="font-size:32px">Welcome to the <strong>Phase 2</strong>. </div></br>'+
      '<div style="font-size:24px">Now, we will add a set of <b>cues</b>. The four cues are: </br>'+
      '(1) circle, (2) triangle, (3) diamond, and (4) square.</div></br>' +
      'The cues will appear before each of the two tasks (motion and color).</br>'+
      'They will indicate <b>which task you are performing</b>.</br></br>' +
      'Click next for a visual example.'
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

/* define instructions block */
var instructions_cue_motion = {
  type: 'instructions',
  pages: [
    "<p>To cue the <strong>motion</strong> task, you will be shown one of the two cues below.</p>" +
        "<div class='row'><div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + motion_cues[1] + ".png'></img>" +
        "<p class='small'><strong>"+motion_cues[1]+" cues motion task</br>(UP or DOWN?)</strong></p></div>" +
        "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + motion_cues[2] + ".png'></img>" +
        "<p class='small'><strong>"+motion_cues[2]+" cues motion task</br>(UP or DOWN?)</strong></p></div></div>" +
      "</br>In other words, after you see one of these cues,</br>you will decide whether the majority of dots are going UP or DOWN."
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};
var instructions_cue_color = {
  type: 'instructions',
  pages: [
    "<p>To cue the <strong>color</strong> task, you will be shown one of the two cues below.</p>" +
        "<div class='row'><div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + color_cues[1] + ".png'></img>" +
        "<p class='small'><strong>"+color_cues[1]+" cues color task</br>(RED or BLUE?)</strong></p></div>" +
        "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + color_cues[2] + ".png'></img>" +
        "<p class='small'><strong>"+color_cues[2]+" cues color task</br>(RED or BLUE?)</strong></p></div></div>" +
      "</br>In other words, after you see one of these cues,</br>you will decide whether the majority of dots are RED or BLUE."
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};
var instructions_cue2 = {
  type: 'instructions',
  pages: [
      "<div style='font-size:24px'>You will now be tested on how well you know the cues!</div></br>" +
      "You will see one of the cues in the middle of the screen</br>" +
      "with the words 'motion task' and 'color task' on either side of it.</br><hr>" +
      "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>Motion Trial (left)</strong></p></div>" +
      "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>Color Trial (right)</strong></p></div>" +
       "</div>" +
       "<div>" +
          "<div style='float: center;'><img src='/static/images/square.png'></img></div>" +
       "</div>" +
      "<hr>You will have to respond by pressing either the</br> <b><u>left</u></b> arrow key (&larr;)</br> or </br><b><u>right</u></b> arrow key (&rarr;)</br>" +
      "depending on which task type the cue is associated with.</br>",
      "Be sure to pay attention!</br></br>" +
      "Depending on the trial, the location of 'motion task' and 'color task' may <b><u>switch</u></b>.</br><hr>" +
      "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>Color Trial (left arrow)</strong></p></div>" +
      "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>Motion Trial (right arrow)</strong></p></div>" +
             "</div>" +
             "<div>" +
                "<div style='float: center;'><img src='/static/images/square.png'></img></div>" +
             "</div><hr>",
       "If you pick the <font color='#3CB371'>right task</font>, it will turn <font color='#3CB371'>green</font>.</br><hr>" +
       "<div class='column' style='border:3px solid green'>" +
                 "<p class='small'><strong>Motion Trial (left arrow)</strong></p></div>" +
        "<div class='column' style='border:3px solid grey'>" +
                 "<p class='small'><strong>Color Trial (right arrow)</strong></p></div>" +
              "</div>" +
              "<div>" +
                 "<div style='float: center;'><img src='/static/images/square.png'></img></div>" +
              "</div><hr>"+
              "<font color='grey'>Click next to review the cues before we begin the practice round.</font>",
        "If you pick the <font color='red'>wrong</font> task, it will turn <font color='red'>red</font>.</br><hr>" +
        "<div class='column' style='border:3px solid grey'>" +
                  "<p class='small'><strong>Color Trial (left arrow)</strong></p></div>" +
        "<div class='column' style='border:3px solid red'>" +
                  "<p class='small'><strong>Motion Trial (right arrow)</strong></p></div>" +
               "</div>" +
               "<div>" +
                  "<div style='float: center;'><img src='/static/images/square.png'></img></div>" +
               "</div><hr>"+
      "Click next to review the cues before we begin the practice round.",
    "<div style='font-size:24px'>Let's practice associating cues and their tasks.</div>" +
        "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + motion_cues[1] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + motion_cues[2] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
      "</div>" +
      "<div class='row'>"+
        "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + color_cues[1] + ".png'></img>" +
        "<p class='small'><strong>COLOR task</br></strong></p></div>" +
        "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + color_cues[2] + ".png'></img>" +
        "<p class='small'><strong>COLOR task</br></strong></p></div>" +
      "</div></br>" +
      "Whenever you're ready, place your fingers on the left and right arrow keys and press next!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_cue3 = {
  type: 'instructions',
  pages: [
    "Now that you've gotten a chance to practice, you have to do the same task without any hints.</br></br>" +
    "In order to move on, you will need to get 18 out of the last 20 trials correct.</br>" +
    "To move on, you have to <b><u>memorize</u></b> whether a cue corresponds to motion or color!</br></br>"+
    "Click next to review the cues again. Please memorize them!",
  "<div style='font-size:24px'>Try your best to memorize these cues and their tasks.</div>" +
      "<div class='row'>"+
        "<div class='column' style='float:center; border-style: solid;'><img src='/static/images/" + motion_cues[1] + ".png'></img>" +
        "<p class='small'><strong>MOTION task</br></strong></p></div>" +
        "<div class='column' style='float:center; border-style: solid;'><img src='/static/images/" + motion_cues[2] + ".png'></img>" +
        "<p class='small'><strong>MOTION task</br></strong></p></div>" +
      "</div>" +
      "<div class='row'>"+
        "<div class='column' style='float:center; border-style: solid;'><img src='/static/images/" + color_cues[1] + ".png'></img>" +
        "<p class='small'><strong>COLOR task</br></strong></p></div>" +
        "<div class='column' style='float:center; border-style: solid;'><img src='/static/images/" + color_cues[2] + ".png'></img>" +
        "<p class='small'><strong>COLOR task</br></strong></p></div>" +
      "</div>" +
    "Please ready your fingers on the left and right arrow keys and press next whenever you're ready!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var cue_example = {
  timeline: [cue],
  timeline_variables: [{
    data: {
      cue_shape: 'circle'
    }
  }],
}

// Generates template for preparation stimulus
var cue_preparation = {
  type: 'html-keyboard-response',
  stimulus: '',
  choices: jsPsych.NO_KEYS,
  trial_duration: cue_preparation_duration,

  on_start: function(cue_preparation){
    if(fixation_cross){
      cue_preparation.prompt = '<div style="font-size:60px; color:black;">+</div>';
    }else{
      cue_preparation.prompt = '';
    }
  }
}

var cue_stimulus = {
  type: "html-keyboard-response",
  stimulus: '',
  choices: [37, 39],
  data: jsPsych.timelineVariable('data'),
  trial_duration: cue_stimulus_duration,

  on_start: function(cue_stimulus){
    if(cue_stimulus.data.practice){
      cue_stimulus.trial_duration = cue_stimulus.trial_duration + 3000;
    }

    cue_stimulus.stimulus = generateCue(cue_stimulus.data.cue, cue_stimulus.data.swap, cue_stimulus.data.practice, cue_stimulus.data.correct_choice);
  },

  on_finish: function(data){
    if(data.key_press == null){
      data.correct == null;
    }else{
      data.correct = data.key_press == data.correct_choice;
    }
  }

}

var cue_feedback = {
  type: "html-keyboard-response",
  stimulus: '',
  choices: jsPsych.NO_KEYS,
  data: jsPsych.timelineVariable('data'),
  trial_duration: cue_feedback_duration, //Duration of each cue in ms

  on_start: function(cue_feedback){
    // get data from previous trial
    var prev_trial_data = jsPsych.data.get().last(1).values()[0];

    if(cue_feedback.data.practice){
      cue_feedback.trial_duration = cue_feedback.trial_duration + 2000;
    }else{
      trial_counter += 1;
      if(prev_trial_data.correct){
        response_array.push(1);
      }else{
        response_array.push(0);
      }

      if(response_array.length >= 20){ // start checking at 20 trials
        var temp = response_array.slice(trial_counter - 20);
        sum = temp.reduce(function(pv, cv) { return pv + cv; }, 0);
        if(sum >= 18 || trial_counter >= maxTrials){
          end_phase = true;
        }
      }else{
        sum = response_array.reduce(function(pv, cv) { return pv + cv; }, 0);
      }

      //every fifth trial, give them time to read number of trials left
      if(trial_counter % 5 == 0){
        cue_feedback.trial_duration = cue_feedback.trial_duration + 2250;
      }
    }

    cue_feedback.stimulus = generateCue(cue_feedback.data.cue, cue_feedback.data.swap, cue_feedback.data.practice, prev_trial_data.key_press, prev_trial_data.correct, trial_counter);
  }
}

function generateCue(cue, swap, practice = false, answer = '', correct = true, trial_counter = -1){
  var response;
  var task = ['Motion','Color'];
  if(swap){
    task = task.reverse();
  }

  var key;
  if(practice){
    if(answer == 37 && correct){
      key = 'left arrow key'
    }else if(answer == 39 && correct){
      key = 'right arrow key'
    }else if(answer == 37 && ~correct){
      key = 'right arrow key'
    }else if(answer == 39 && !correct){
      key = 'left arrow key'
    }
  }

  //trial_counter -1 indicates cue_stimulus
  if(trial_counter == -1){answer = ''}

  if(answer == null){ // no response, respond faster
    response = "<div class='column' style='border:3px solid grey'>" +
              "<p class='small'><strong>" + task[0] + " Trial (&larr;)</strong></p></div>" +
              "<div class='column' style='border:3px solid grey'>" +
              "<p class='small'><strong>(&rarr;) " + task[1] + " Trial</strong></p></div>" +
           "</div>" +
           "<div style='height: 158.667px'>" +
              "<div style='justify-content: center; display: flex; font-size:30px;" +
              "height: 158.667px; align-items: center;'>Respond Faster!</div>" +
           "</div>"

  }else if(answer == 37){ // left arrow key
    if(correct){
      response = "<div class='column' style='border:3px solid green'>" +
                "<p class='small'><strong>" + task[0] + " Trial (&larr;)</strong></p></div>" +
                "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>(&rarr;) " + task[1] + " Trial</strong></p></div>" +
             "</div>" +
             "<div>" +
                "<div style='float: center;'><img src='/static/images/" + cue + ".png'></img></div>" +
             "</div>"
    }else{
      response = "<div class='column' style='border:3px solid red'>" +
                "<p class='small'><strong>" + task[0] + " Trial (&larr;)</strong></p></div>" +
                "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>(&rarr;) " + task[1] + " Trial</strong></p></div>" +
             "</div>" +
             "<div>" +
                "<div style='float: center;'><img src='/static/images/" + cue + ".png'></img></div>" +
             "</div>"
    }

  }else if(answer == 39){
    if(correct){
      response = "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>" + task[0] + " Trial (&larr;)</strong></p></div>" +
                "<div class='column' style='border:3px solid green'>" +
                "<p class='small'><strong>(&rarr;) " + task[1] + " Trial</strong></p></div>" +
             "</div>" +
             "<div>" +
                "<div style='float: center;'><img src='/static/images/" + cue + ".png'></img></div>" +
             "</div>"
    }else{
      response = "<div class='column' style='border:3px solid grey'>" +
                "<p class='small'><strong>" + task[0] + " Trial (&larr;)</strong></p></div>" +
                "<div class='column' style='border:3px solid red'>" +
                "<p class='small'><strong>(&rarr;) " + task[1] + " Trial</strong></p></div>" +
             "</div>" +
             "<div>" +
                "<div style='float: center;'><img src='/static/images/" + cue + ".png'></img></div>" +
             "</div>"
    }
  }else{
    response = "<div class='column' style='border:3px solid grey'>" +
              "<p class='small'><strong>" + task[0] + " Trial (&larr;)</strong></p></div>" +
              "<div class='column' style='border:3px solid grey'>" +
              "<p class='small'><strong>(&rarr;) " + task[1] + " Trial</strong></p></div>" +
           "</div>" +
           "<div>" +
              "<div style='float: center;'><img src='/static/images/" + cue + ".png'></img></div>" +
           "</div>"
  }

  filler = "<div style='width: 700px; height: 100px;'>" +
              "<div style='float: center; color: grey'>Filler</div>" +
           "</div>";

  if(practice){
    if(answer == null){
        if(cue == motion_cues[1] || cue == motion_cues[2]){
                  return "<div style='color:white'; class='row'>The "+ motion_cues[1] +" cues a motion trial.</div><div class='row'>" + response + filler;
        }else if(cue == color_cues[1] || cue == color_cues[2]){
                  return "<div style='color:white'; class='row'>The "+ motion_cues[1] +" cues a color trial.</div><div class='row'>" + response + filler;
        }
    }else if(cue == motion_cues[1]){
      return "<div style='color:white'; class='row'>The "+ motion_cues[1] +" cues a motion trial (press the "+key+").</div><div class='row'>" + response + filler;
    }else if(cue == motion_cues[2]){
      return "<div style='color:white'; class='row'>The "+ motion_cues[2] +" cues a motion trial (press the "+key+").</div><div class='row'>" + response + filler;
    }else if(cue == color_cues[1]){
      return "<div style='color:white'; class='row'>The "+ color_cues[1] +" cues a color trial (press the "+key+").</div><div class='row'>" + response + filler;
    }else if(cue == color_cues[2]){
      return "<div style='color:white'; class='row'>The "+ color_cues[2] +" cues a color trial (press the "+key+").</div><div class='row'>" + response + filler;
    }
  }else{
    if(trial_counter % 5 == 0){ //answer != null &&
      return "<div class='row'>" +
             "You need at least "+ (18-sum) + " more correct trials to move on!</div>"+
             "<div class='row'>" + response + filler;
    }else{
      return "<div style='color:grey'; class='row'>-</div><div class='row'>" + response + filler;
    }
  }


}

var cue_stimuli_practice = [
  { data: {correct_choice: 37, task: 'motion', cue: motion_cues[1], practice: true, swap: false}},
  { data: {correct_choice: 37, task: 'motion', cue: motion_cues[2], practice: true, swap: false}},
  { data: {correct_choice: 39, task: 'color', cue: color_cues[1], practice: true, swap: false}},
  { data: {correct_choice: 39, task: 'color', cue: color_cues[2], practice: true, swap: false}},
  { data: {correct_choice: 39, task: 'motion', cue: motion_cues[1], practice: true, swap: true}},
  { data: {correct_choice: 39, task: 'motion', cue: motion_cues[2], practice: true, swap: true}},
  { data: {correct_choice: 37, task: 'color', cue: color_cues[1], practice: true, swap: true}},
  { data: {correct_choice: 37, task: 'color', cue: color_cues[2], practice: true, swap: true}}
];

var cue_stimuli = [
  { data: {correct_choice: 37, task: 'motion', cue: motion_cues[1], practice: false, swap: false}},
  { data: {correct_choice: 37, task: 'motion', cue: motion_cues[2], practice: false, swap: false}},
  { data: {correct_choice: 39, task: 'color', cue: color_cues[1], practice: false, swap: false}},
  { data: {correct_choice: 39, task: 'color', cue: color_cues[2], practice: false, swap: false}},
  { data: {correct_choice: 39, task: 'motion', cue: motion_cues[1], practice: false, swap: true}},
  { data: {correct_choice: 39, task: 'motion', cue: motion_cues[2], practice: false, swap: true}},
  { data: {correct_choice: 37, task: 'color', cue: color_cues[1], practice: false, swap: true}},
  { data: {correct_choice: 37, task: 'color', cue: color_cues[2], practice: false, swap: true}}
];

var cue_practice = {
  timeline: [cue_preparation, cue_stimulus, cue_feedback],
  timeline_variables: cue_stimuli_practice,
  randomize_order: true,
  repetitions: 1,
  sample: {
      type: "without-replacement",
      size: 8
    }
  }

var cue_sequence = {
  timeline: [cue_preparation, cue_stimulus, cue_feedback],
  timeline_variables: cue_stimuli,
  randomize_order: true,
  repetitions: 1,
  sample: {
      type: "with-replacement",
      size: 1
    },
  loop_function: function(data){ // loop until 90% of last 20 trials are correct
      if(end_phase){
          return false;
      }else{
          return true;
      }
    }
  }

if(phase2){
  timeline.push(instructions_cue);
  timeline.push(cue_example, stim_example);
  if(parseInt(counterbalance) % 2 == 0){
    timeline.push(instructions_cue_motion);
    timeline.push(instructions_cue_color);
  }else{
    timeline.push(instructions_cue_color);
    timeline.push(instructions_cue_motion);
  }
  timeline.push(instructions_cue2);
  timeline.push(cue_practice);
  timeline.push(instructions_cue3);
  timeline.push(cue_sequence);
}

// --------------------
// THIRD PHASE: cued task switching practice
// --------------------
var instructions_prc = {
  type: 'instructions',
  pages: [
    '<div style="font-size:32px">Welcome to the <strong>Phase 3</strong>. </div></br>'+
    '<div style="font-size:24px">We will be swapping between color and motion tasks.</div></br>' +
    'The cues you learned earlier will tell you if you </br>'+
    'are supposed to focus on color or motion.</br></br>' +
    'Note: there are approximately 30 minutes left in the experiment from this point.</br></br>',

    '<div style="font-size:24px">Here is what the sequence will look like:</div></br>' +
    "<img src='/static/images/sequence_single.PNG'></img>"
  ],
  show_clickable_nav: true
};

var instructions_prc_man1 = {
  type: 'instructions',
  pages: [
    '<div style="font-size:32px">Welcome to the <strong>Phase 3</strong>. </div></br>'+
    '<div style="font-size:24px">We will be swapping between color and motion tasks.</div></br>' +
    'The cues you learned earlier will tell you if you </br>'+
    'are supposed to focus on color or motion.</br></br>' +
    'Note: there are approximately 30 minutes left in the experiment from this point.</br></br>',

    '<div style="font-size:24px">Here is what the sequence will look like:</div></br>' +
    "<img src='/static/images/sequence.PNG'></img>"
  ],
  show_clickable_nav: true
};

var instructions_prc_m_man1 = {
  type: 'instructions',
  pages: [
    '<div style="font-size:24px">We will now focus on the <u>motion</u> cues.</div></br>' +
    'You will see a motion cue (' + motion_cues[1] + ' or ' + motion_cues[2] + ')'+
    ' and then complete a number of motion tasks.</br>' +
    "<img src='/static/images/miniblock_color_" + color_cues[1] + "_motion.PNG'></img></br>" +
    "This is what we call a <u>mini-block</u> (cue + several trials).</br>",

    "<div style='font-size:24px'><b>Remember:</b></br>" +
    "We're coming back to 'A' or 'L' responses.</br>" +
    'A is for majority upward motion.</br>' +
    'L is for majority downward motion.</br></br>' +
    "<b>Also:</b>"+
    "<font color='#FA8072'><b><h3>You'll no longer be waiting for the '?'</b></br>Respond as soon as you know the answer.</h3></font>" +
    'Click next for an example motion cue + trial.'
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_prc_m = {
  type: 'instructions',
  pages: [
    '<div style="font-size:24px">We will now focus on the <u>motion</u> cues.</div></br>' +
    'You will see a motion cue (' + motion_cues[1] + ' or ' + motion_cues[2] + ')'+
    ' and then complete a motion task.</br></br>' +
    "<b>Remember:</b></br>" +
    "We're coming back to 'A' or 'L' responses.</br>" +
    'A is for coherent dots moving UP.</br>' +
    'L is for coherent dots moving DOWN.</br></br>' +
    "<b>Also:</b>"+
    "<font color='#FA8072'><b><h3>You'll no longer be waiting for the '?'</b></br>Respond as soon as you know the answer.</h3></font>"+
    'Click next for an example motion cue + trial.'
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var cued_practice_example1 = {
  timeline: [cue,preparation,stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Motion Task - Down (Press L)',
    trial_duration: 2500,
    data: {
      task: 'motion',
      cue_shape: motion_cues[1],
      phase: '3'
    }
  }],
}

var cued_practice_example2 = {
  timeline: [cue,preparation,stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'up',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Motion Task - Up (Press A)',
    trial_duration: 2500,
    data: {
      task: 'motion',
      cue_shape: motion_cues[2],
      phase: '3'
    }
  }],
}

var cued_practice_example3 = {
  timeline: [cue,preparation,stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'red',
    minority_color: 'blue',
    text: 'Motion Task - Down (Press L)',
    trial_duration: 2500,
    data: {
      task: 'motion',
      cue_shape: motion_cues[1],
      phase: '3'
    }
  }],
}

var practice_example2 = {
  timeline: [stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'up',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Motion Task - Up (Press A)',
    trial_duration: 2500,
    data: {
      task: 'motion',
      cue_shape: motion_cues[2],
      phase: '3'
    }
  }],
}

var practice_example3 = {
  timeline: [stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'red',
    minority_color: 'blue',
    text: 'Motion Task - Down (Press L)',
    trial_duration: 2500,
    data: {
      task: 'motion',
      cue_shape: motion_cues[1],
      phase: '3'
    }
  }],
}

var instructions_prc_c_man1 = {
  type: 'instructions',
  pages: [
    '<div style="font-size:24px">We will now focus on the <u>color</u> cues.</div></br>' +
    'You will see a color cue (' + color_cues[1] + ' or ' + color_cues[2] + ')' +
    ' and then complete a number of color tasks.</br>' +
    "<img src='/static/images/miniblock_color_" + color_cues[1] + ".PNG'></img></br>" +
    "This is what we call a <u>mini-block</u> (cue + several trials).</br>",
    "<div style='font-size:24px'><b>Remember:</b></br>" +
    "We're coming back to 'A' or 'L' responses.</br>" +
    'A is for majority blue dots.</br>' +
    'L is for majority red dots.</br></br>' +
    "<b>Also:</b></br>"+
    "<font color='#FA8072'><b><h3>You'll no longer be waiting for the '?'</b></br>Respond as soon as you know the answer.</h3></font>"+
    'Click next for an color cue + trial.'
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_prc_c = {
  type: 'instructions',
  pages: [
    '<div style="font-size:24px">We will now focus on the <u>color</u> cues.</div></br>' +
    'You will see a color cue (' + color_cues[1] + ' or ' + color_cues[2] + ')' +
    ' and then complete a color task.</br></br>' +
    "<b>Remember:</b></br>" +
    "We're coming back to 'A' or 'L' responses.</br>" +
    'A is for majority blue dots.</br>' +
    'L is for majority red dots.</br></br>' +
    "<b>Also:</b></br>"+
    "<font color='#FA8072'><b><h3>You'll no longer be waiting for the '?'</b></br>Respond as soon as you know the answer.</h3></font>"+
    'Click next for an color cue + trial.'
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var cued_practice_example4 = {
  timeline: [cue,preparation,stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'down',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Color Task - Blue (Press A)',
    trial_duration: 2500,
    data: {
      task: 'color',
      cue_shape: color_cues[1],
      phase: '3'
    }
  }],
}

var cued_practice_example5 = {
  timeline: [cue,preparation,stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'red',
    minority_color: 'blue',
    text: 'Color Task - Red (Press L)',
    trial_duration: 2500,
    data: {
      task: 'color',
      cue_shape: color_cues[2],
      phase: '3'
    }
  }],
}

var cued_practice_example6 = {
  timeline: [cue,preparation,stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'up',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Color Task - Blue (Press A)',
    trial_duration: 2500,
    data: {
      task: 'color',
      cue_shape: color_cues[2],
      phase: '3'
    }
  }],
}

var practice_example5 = {
  timeline: [stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'l',
    coherent_direction: 'down',
    majority_color: 'red',
    minority_color: 'blue',
    text: 'Color Task - Red (Press L)',
    trial_duration: 2500,
    data: {
      task: 'color',
      cue_shape: color_cues[2],
      phase: '3'
    }
  }],
}

var practice_example6 = {
  timeline: [stimulus,feedback],
  timeline_variables: [{
    correct_choice: 'a',
    coherent_direction: 'up',
    majority_color: 'blue',
    minority_color: 'red',
    text: 'Color Task - Blue (Press A)',
    trial_duration: 2500,
    data: {
      task: 'color',
      cue_shape: color_cues[2],
      phase: '3'
    }
  }],
}

var instructions_prc_block1_man1 = {
  type: 'instructions',
  pages: [
    "<div style='font-size:36px'>Fantastic! Now you'll start the practice blocks.</div></br></br>" +
    "<div style='font-size:24px'>" +
    "Just like in Phase 1, you will have a block of trials, but now</br>"+
    "we will add the <u>four cues</u> (square, diamond, triangle, circle).</br></br>"+
    "Press next for important instructions!",
    "<div style='font-size:24px'>" +
    "In a <u>mini-block</u>, you will see a cue followed by a number of trials.</br></br>" +
    "<img src='/static/images/miniblock_color_" + color_cues[1] + ".PNG'></img></br>" +
    "The cue indicates the task (color or motion) that you should be doing for all the trials.</div>",

    "<div style='font-size:24px'>" +
    'Do the same task for all the subsequent trials until you get a new cue.</br></br>'+
    "<img src='/static/images/miniblock2_color_" + color_cues[1] + ".PNG'></img></br>" +
    "Sometimes, the task will change from color to motion (or vice versa).</br></br>" +
    "This is called a <u>switch</u>.</div></br>",

    "<div style='font-size:24px'>" +
    'Other times, the task will stay the same between mini-blocks.</br></br>'+
    "<img src='/static/images/miniblock3_color_" + color_cues[1] + ".PNG'></img></br>" +
    "This is called a <u>repetition</u>.</div></br>",

    "<div style='font-size:24px'><p style='color:grey;'>Filler</p></div>" +
    "<div style='font-size:24px'>" +
    "The entire sequence will be made up of mini-blocks: </br></br>" +
    "<img src='/static/images/instructions_color_" + color_cues[1] + ".PNG'></img></br></br>" +
    "This will make more sense with some practice. </div></br>"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_prc_block1_man23 = {
  type: 'instructions',
  pages: [
    "<div style='font-size:32px'>Fantastic! Now you'll start the practice blocks.</div></br>" +
    "You will have a block of trials just like Phase 1, but now we will add cues </br>"+
    "before each trial, to indicate the current task to be performed.</br></br>" +
    "Click next to learn about bonus payments."
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var instructions_prc_block1 = {
  type: 'instructions',
  pages: [
    "<font color='#FA8072'><h3>It is important to know that you get </br><b></font>more bonus payment<font color='#FA8072'> for responding </font>"+
    "</br>quickly<font color='#FA8072'> and </font>accurately.</h3>"+

    "<h3>We will compare <font color='#FA8072'>your performance </font>(speed and accuracy) </br>"+
    "<font color='#FA8072'>to the other participants, and we will</br>"+
    "</font>reward<font color='#FA8072'> you accordingly </font>(maximum of $3.00)</h3>"+

    'Click next to review the cues again.',
    "<div style='font-size:24px'>Here are the cues and the tasks they indicate:</div>" +
        "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + motion_cues[1] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + motion_cues[2] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
        "</div>" +
        "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + color_cues[1] + ".png'></img>" +
          "<p class='small'><strong>COLOR task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + color_cues[2] + ".png'></img>" +
          "<p class='small'><strong>COLOR task</br></strong></p></div>" +
        "</div></br>",
      "<div style='font-size:24px'>Some reminders before you begin:</div></br>" +
        'A is for up (motion) and blue (color)</br>' +
        'L is for down (motion) and red (color)</br></br>' +
        "<font color='#FA8072'><b>You'll no longer be waiting for the '?'</b></font></br>" +
        "You'll have 1.5 seconds to respond.</br></br>" +
      "Please ready your fingers on the A and L keys and press next whenever you're ready!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var practice_debrief1 = {
  type: 'html-button-response',
  choices: ['Continue'],
  is_html: true,
  stimulus: function(){
    var accuracy = jsPsych.data.get().filterCustom(function(x){ return x.trial_type == 'RDK' && x.phase == '3.1'}).select('correct');
    var percent_accurate = Math.floor(accuracy.sum() / accuracy.count() * 100)
    var mean_rt = jsPsych.data.get().filterCustom(function(x){ return x.trial_type == 'RDK' && x.phase == '3.1' && x.rt != -1}).select('rt').mean();
    var mean_rt_seconds = mean_rt / 1000;
    var display_rt = mean_rt_seconds.toFixed(2); //round to 2 decimal points

    var msg = "<div style='font-size:24px'>Practice Block Results:</div>" +
      "<p>You responded correctly <strong>" + percent_accurate + "%</strong> of the time,</br>"+
      "with an average response time of <strong>" + display_rt + "</strong> seconds.</p>";
    if(percent_accurate >= 75){
      msg += "<p>Great job! Looks like you are ready to continue to the next practice block.</p>"
    }else{
      msg += "<p>Please try to focus and respond correctly more often!</p>"
    }

    msg += "<p><font color='#FA8072'>Remember that your bonus reward is based on </font> both accuracy <font color='#FA8072'>and </font> response speed!</p>"

    return msg;
  },
}

var instructions_prc3 = {
  type: 'instructions',
  pages: [
    "<div style='font-size:32px'>Great job! You've reached the last practice block.</div></br>" +
    "<div style='font-size:24px'>For this block, we <b> remove the cue hints</b> and <b>reduce feedback after each trial</b>.</div></br>" +
    "Just like in the last block, you will have a series of trials, but now there will be no cue hints. </br>"+
    "In addition, the feedback after each trial will only tell you whether it was a motion or color task.</br></br>" +
    "Click next to learn about bonus payments.",

    "<font color='#FA8072'><h3>It is important to know that you get </br><b></font>more bonus payment<font color='#FA8072'> for responding </font>"+
    "</br>quickly<font color='#FA8072'> and </font>accurately.</h3>"+

    "<h3>We will compare <font color='#FA8072'>your performance </font>(speed and accuracy) </br>"+
    "<font color='#FA8072'>to the other participants, and we will</br>"+
    "</font>reward<font color='#FA8072'> you accordingly </font>(maximum of $3.00)</h3>"+

    'Click next to review the cues again.',
    "<div style='font-size:24px'>Here are the cues and the tasks they indicate:</div>" +
        "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + motion_cues[1] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + motion_cues[2] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
        "</div>" +
        "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + color_cues[1] + ".png'></img>" +
          "<p class='small'><strong>COLOR task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + color_cues[2] + ".png'></img>" +
          "<p class='small'><strong>COLOR task</br></strong></p></div>" +
        "</div></br>",
      "<div style='font-size:24px'>Some reminders before you begin:</div></br>" +
      "There will be no cue hints. </br>"+
      "The feedback after each trial will only tell you whether it was a motion or color task.</br></br>" +
        'A is for up (motion) and blue (color)</br>' +
        'L is for down (motion) and red (color)</br></br>' +
        "You'll no longer be waiting for the '?'.</br>" +
        "You'll have 1.5 seconds to respond.</br></br>" +
      "Please ready your fingers on the A and L keys and press next whenever you're ready!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var practice_debrief2 = {
  type: 'html-button-response',
  choices: ['Continue'],
  is_html: true,
  stimulus: function(){
    var accuracy = jsPsych.data.get().filterCustom(function(x){ return x.trial_type == 'RDK' && x.phase == '3.2'}).select('correct');
    var percent_accurate = Math.floor(accuracy.sum() / accuracy.count() * 100)
    var rt_mean = jsPsych.data.get().filterCustom(function(x){ return x.trial_type == 'RDK' && x.phase == '3.2' && x.rt != -1 && x.rt != null}).select('rt').mean();
    var rt_mean_seconds = rt_mean / 1000;
    var rt_display = rt_mean_seconds.toFixed(2); //round to 2 decimal points

    if(dynamic_trial_duration){
      var rt_sd = jsPsych.data.get().filterCustom(function(x){ return x.trial_type == 'RDK' && x.phase == '3.2' && x.rt != -1 && x.rt != null}).select('rt').sd();

      // set a baseline of 850 and 1500
      if(rt_mean + rt_sd < 850){
        currentTrialDuration = 850;
      }else if(rt_mean + rt_sd > 1500){
        currentTrialDuration = 1500;
      }else{
        currentTrialDuration = rt_mean + rt_sd;
      }
    }

    var msg = "<div style='font-size:24px'>Practice Block Results:</div>" +
      "<p>You responded correctly <strong>" + percent_accurate + "%</strong> of the time,</br>"+
      "with an average response time of <strong>" + rt_display + "</strong> seconds.</p>";
    if(percent_accurate >= 75){
      msg += "<p>Great job! Looks like you are ready to continue to the next practice block.</p>"
    }else{
      msg += "<p>Please try to focus and respond correctly more often!</p>"
    }

    msg += "<p><font color='#FA8072'>Remember that your bonus reward is based on </font> both accuracy <font color='#FA8072'>and </font> response speed!</p>"

    return msg;
  },
}

// counterbalance showing motion or color first
if(parseInt(p1_cb) % 2 == 0 && phase3){
  if(manipulation != 'frequency'){
    timeline.push(instructions_prc);
    timeline.push(instructions_prc_m);
    timeline.push(cued_practice_example1);
    timeline.push(cued_practice_example2);
    timeline.push(cued_practice_example3);
    timeline.push(cued_practice_example3);
    timeline.push(cued_practice_example2);
  }else{
    timeline.push(instructions_prc_man1);
    timeline.push(instructions_prc_m_man1);
    timeline.push(cued_practice_example1);
    timeline.push(practice_example2);
    timeline.push(practice_example3);
    timeline.push(practice_example3);
    timeline.push(practice_example2);
  }

  if(manipulation != 'frequency'){
    timeline.push(instructions_prc_c);
    timeline.push(cued_practice_example4);
    timeline.push(cued_practice_example5);
    timeline.push(cued_practice_example6);
    timeline.push(cued_practice_example6);
    timeline.push(cued_practice_example5);
  }else{
    timeline.push(instructions_prc_c_man1);
    timeline.push(cued_practice_example4);
    timeline.push(practice_example5);
    timeline.push(practice_example6);
    timeline.push(practice_example6);
    timeline.push(practice_example5);
  }
}else if(parseInt(p1_cb) % 2 == 1 && phase3){
  if(manipulation != 'frequency'){
    timeline.push(instructions_prc);
    timeline.push(instructions_prc_c);
    timeline.push(cued_practice_example4);
    timeline.push(cued_practice_example5);
    timeline.push(cued_practice_example6);
    timeline.push(cued_practice_example6);
    timeline.push(cued_practice_example5);
  }else{
    timeline.push(instructions_prc_man1);
    timeline.push(instructions_prc_c_man1);
    timeline.push(cued_practice_example4);
    timeline.push(practice_example5);
    timeline.push(practice_example6);
    timeline.push(practice_example6);
    timeline.push(practice_example5);
  }

  if(manipulation != 'frequency'){
    timeline.push(instructions_prc_m);
    timeline.push(cued_practice_example1);
    timeline.push(cued_practice_example2);
    timeline.push(cued_practice_example3);
    timeline.push(cued_practice_example3);
    timeline.push(cued_practice_example2);
  }else{
    timeline.push(instructions_prc_m_man1);
    timeline.push(cued_practice_example1);
    timeline.push(practice_example2);
    timeline.push(practice_example3);
    timeline.push(practice_example3);
    timeline.push(practice_example2);
  }
}

//generate timeline variables
function generateTrials(vars, phase){
  var task;
  if(vars[0] == 1){
    task = 'color';
  }else if(vars[0] == 2){
    task = 'motion';
  }

  var cue_select = vars[1];
  var cue_shape;
  if(task == "motion"){ //motion
    if(cue_select == 1){
      cue_shape = motion_cues[1];
    }else if(cue_select == 2){
      cue_shape = motion_cues[2];
    }
  }else if(task == "color"){ //color
    if(cue_select == 1){
      cue_shape = color_cues[1];
    }else if(cue_select == 2){
      cue_shape = color_cues[2];
    }
  }

  var dot_color; // 1-blue, 2-red
  if(vars[2] == 1){
    majority_color = "blue";
    minority_color = "red";
  }else if(vars[2] == 2){
    majority_color = "red";
    minority_color = "blue";
  }

  var coherent_direction; // 1-up 2-down
  if(vars[3] == 1){
    coherent_direction = 'up';
  }else if(vars[3] == 2){
    coherent_direction = 'down';
  }

  var correct_choice; // 1-a (left), 2-a (right)
  if(vars[8] == 1){
    correct_choice = 'a';
  }else if(vars[8] == 2){
    correct_choice = 'l';
  }

  var task_transition = vars[4]
  var cue_transition = vars[5]
  var response_transition = vars[6]
  var miniblock_size = vars[7]
  var miniblock_trial = vars[9]
  var miniblock = vars[10]
  var block = vars[11]

  return [{
      correct_choice: correct_choice,
      coherent_direction: coherent_direction,
      majority_color: majority_color,
      minority_color: minority_color,

      data: {phase: phase,
            task: task,
            cue_shape: cue_shape,
            task_transition: task_transition,
            cue_transition: cue_transition,
            response_transition: response_transition,
            miniblock_size: miniblock_size,
            miniblock_trial: miniblock_trial,
            miniblock: miniblock,
            block: block}
    }];
}


if(phase31){
  if(manipulation == 'frequency'){
    timeline.push(instructions_prc_block1_man1);
  }else{
    timeline.push(instructions_prc_block1_man23);
  }
  timeline.push(instructions_prc_block1);

  for (line in prc_lines_1){
    var trial_vars_prc = generateTrials(prc_lines_1[line], '3.1'); //generate timeline variables
    var miniblock_trial = trial_vars_prc[0].data.miniblock_trial; // define miniblock trial

    if(miniblock_trial == 1){
      var cue_sequence = {
        timeline: [cue, preparation, stimulus, feedback],
        timeline_variables: trial_vars_prc
        }
      timeline.push(cue_sequence);
    }else{
      var stim_sequence = {
        timeline: [stimulus, feedback],
        timeline_variables: trial_vars_prc
        }
      timeline.push(stim_sequence);
    }

  }
  if(training_feedback){
    timeline.push(practice_debrief1);
  }
}

if(phase32){
  timeline.push(instructions_prc3)

  for (line in prc_lines_2){
    var trial_vars_prc = generateTrials(prc_lines_2[line], '3.2'); //generate timeline variables
    var miniblock_trial = trial_vars_prc[0].data.miniblock_trial; // define miniblock trial

    if(miniblock_trial == 1){
      var cue_sequence = {
        timeline: [cue, preparation, stimulus, feedback],
        timeline_variables: trial_vars_prc
        }
      timeline.push(cue_sequence);
    }else{
      var stim_sequence = {
        timeline: [stimulus, feedback],
        timeline_variables: trial_vars_prc
        }
      timeline.push(stim_sequence);
    }

  }
  if(training_feedback || dynamic_trial_duration){
    timeline.push(practice_debrief2);
  }
}

// --------------------
// FOURTH PHASE: cued task switching experiment
// --------------------

// dynamic trial duration, calculated as mean + sd of RT during practice block 2
var currentTrialDuration = trial_duration;

var instructions_exp = {
  type: 'instructions',
  pages: [
      '<div style="font-size:32px">Welcome to the <strong>Phase 4</strong>. </div></br>' +
      "This phase will take approximately <b>20 minutes</b>, with a short break in the middle!</br></br>" +
      "The format is the same as Phase 3, but with no hints or feedback.</br>" +
      "<b>The only feedback you'll get is whether your answer was correct or incorrect!</b></br></br>" +
      "Click next to learn about bonus payments.",

      "<font color='#FA8072'><h3>It is important to know that you get </br><b></font>more bonus payment<font color='#FA8072'> for responding </font>"+
      "</br>quickly<font color='#FA8072'> and </font>accurately.</h3>"+

      "<h3>We will compare <font color='#FA8072'>your performance </font>(speed and accuracy) </br>"+
      "<font color='#FA8072'>to the other participants, and we will</br>"+
      "</font>reward<font color='#FA8072'> you accordingly </font>(maximum of $3.00)</h3>"+

      'Click next to review the cues again.',
      "<div style='font-size:24px'>Here are the cues and the tasks they indicate:</div>" +
          "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + motion_cues[1] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + motion_cues[2] + ".png'></img>" +
          "<p class='small'><strong>MOTION task</br></strong></p></div>" +
          "</div>" +
          "<div class='row'>"+
          "<div class='column' style='float:left; border-style: solid;'><img src='/static/images/" + color_cues[1] + ".png'></img>" +
          "<p class='small'><strong>COLOR task</br></strong></p></div>" +
          "<div class='column' style='float:right; border-style: solid;'><img src='/static/images/" + color_cues[2] + ".png'></img>" +
          "<p class='small'><strong>COLOR task</br></strong></p></div>" +
          "</div>",
        "<div style='font-size:24px'>Some reminders before you begin:</div></br>" +
        "<b>The only feedback you'll get is whether your answer was correct or incorrect!</b></br></br>" +
          'A is for up (motion) and blue (color)</br>' +
          'L is for down (motion) and red (color)</br></br>' +
          "Remember, this phase will take approximately <b>20 minutes</b>, with a short break in the middle!</br></br>" +
        "Please ready your fingers on the A and L keys and press next whenever you're ready!"

  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

var pause_text = {
  type: 'instructions',
  pages: [
        "<div style='font-size:32px'>Great job! You're halfway there.</div></br></br>" +
        "<div style='font-size:24px'>Some reminders before you resume:</div></br>" +
          'A is for up (motion) and blue (color)</br>' +
          'L is for down (motion) and red (color)</br></br>' +
        "Please ready your fingers on the A and L keys and press next whenever you're ready!"
  ],
  show_clickable_nav: true,
  post_trial_gap: 1000
};

if(phase4){
  timeline.push(instructions_exp);

  for (line in exp_lines_1){
    var trial_vars_exp = generateTrials(exp_lines_1[line], '4'); //generate timeline variables
    var miniblock_trial = trial_vars_exp[0].data.miniblock_trial; // define miniblock trial

    if(miniblock_trial == 1){
      var cue_sequence = {
        timeline: [cue, preparation, stimulus, feedback],
        timeline_variables: trial_vars_exp
        }
      timeline.push(cue_sequence);
    }else{
      var stim_sequence = {
        timeline: [stimulus, feedback],
        timeline_variables: trial_vars_exp
        }
      timeline.push(stim_sequence);
    }
  }

  timeline.push(pause_text);

  for (line in exp_lines_2){
    var trial_vars_exp = generateTrials(exp_lines_2[line], '4'); //generate timeline variables
    var miniblock_trial = trial_vars_exp[0].data.miniblock_trial; // define miniblock trial

    if(miniblock_trial == 1){
      var cue_sequence = {
        timeline: [cue, preparation, stimulus, feedback],
        timeline_variables: trial_vars_exp
        }
      timeline.push(cue_sequence);
    }else{
      var stim_sequence = {
        timeline: [stimulus, feedback],
        timeline_variables: trial_vars_exp
        }
      timeline.push(stim_sequence);
    }
  }
}

var instructions_final = {
  type: 'instructions',
  pages: [
      "<div style='font-size:32px'>Congratulations on finishing the experiment!</div></br>"
  ],
  show_clickable_nav: true,
  post_trial_gap: 0
};

var instructions_final2 = {
    type: 'html-keyboard-response',
    stimulus: "<h3>Your performance will be compared to the performance</br>" +
    "of the other participants taking this study,</br>" +
    "and we will reward you accordingly (for a maximum of $3.00).</h3></br>"+
    'Press <u>any key</u> to finish the HIT!',
};

timeline.push(instructions_final, instructions_final2)

// record id, condition, counterbalance on every trial
jsPsych.data.addProperties({
    uniqueId: uniqueId,
    condition: condition, // 0 or 1 for the two effort groups
    counterbalance: counterbalance, // counterbalance number (total: 32)
    sequence: experiment_sequence, // sequence number (total: 8)
    phase1_counterbalance: p1_cb, // 0: motion color, 1: color motion
    phase2_counterbalance: p2_cb // 0: circle triangle first, 1: diamond square first
});

//---------Run the experiment---------
jsPsych.init({
    timeline: timeline,
    show_progress_bar: true,

    display_element: 'jspsych-target',

    // record data to psiTurk after each trial
    on_data_update: function(data) {
      if(!debug){
        psiturk.recordTrialData(data);
      }
    },

    on_finish: function() {
      //jsPsych.data.displayData(); //Display the data onto the browser screen
      //jsPsych.data.getInteractionData();

      if(!debug){
        // save data
        psiturk.saveData({
            success: function() {
              psiturk.completeHIT();
            },
      	    error: function() {
      	      psiturk.completeHIT();
      	    }
        });
      }
    },

});
