# online-dot-motion
jsPsych-based implementation of the Dot Motion task. It integrates with psiTurk to interface with Amazon Mechanical Turk.<br>

<a href="https://drive.google.com/open?id=1JA1A92NnjJub5GNjsY7BQKD_TpLMdme0">This document</a> thoroughly describes the motivation and thinking behind the experiment.</br>

## Key files:</br>
<ul>
  <li>
    <b>template/exp.html</b> - this is the html file that is launched, contains references to all the scripts and modules used.
  </li>
  <li>
    <b>static/js/task.js</b> - this is the jsPsych script file that details the experimental flow.
  </li>
  <li>
    <b>static/js/jspsych-6.0.5/plugins/jspsych-RDK.js</b> - custom RDK plugin to support cued task-switching.
  </li>
</ul>

## Tutorials
<a href="https://www.jspsych.org/tutorials/hello-world/">The jsPsych website</a> is an excellent resource for getting started on experimental design and to understand this code better.</br> 

<a href="https://psiturk.org/quick_start/">The psiTurk website</a> is an excellent resource for getting started on interfacing jsPsych experiments with Amazon MTurk.</br> 

We model our file structure after this <a href="https://psiturk.org/ee/W4v3TPAsiD6FUVY8PDyajH">example experiment</a> that demonstrates how to use the jsPsych library with psiTurk.

