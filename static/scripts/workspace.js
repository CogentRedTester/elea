import { runCode, terminateWorker } from "./modules/blocklyHandling";
import { loadExample } from "./modules/exampleHandling";
import { selectedFileChanged, promptForXML } from "./modules/import";
import {
  copyXMLToClipboard,
  downloadWorkspace,
  downloadWorkspaceAsJS,
} from "./modules/export";
import {
  clearLog,
  downloadLog,
  hasLogEntries,
} from "./modules/IOHAnalyzerHandler";
import { highlightAll } from "prismjs";
import $ from "jquery";
import { clearPlots } from "./PlotHandler";
import { clearCSV, downloadCSV, hasCSVEntries } from "./CSVHandler";

$("#run-button").click(runCode);
$("#kill-button").click(terminateWorker);
$("#clear-button").click(clearOutput);
$("#show-button").click(highlightAll);
$("#show-dashboard-button").click(() => {});
// $('#stop-button').click(stopWorker)
// $('#step-button').click(stepCode)
// $('#reset-button').click(generateCodeAndLoadIntoInterpreter)

$("#example-demo").click(() => loadExample("full"));

$("#example-empty").click(() => loadExample("empty"));
$("#example-full").click(() => loadExample("full"));
$("#example-simple").click(() => loadExample("simple"));
$("#example-oneplusone").click(() => loadExample("oneplusone"));
$("#example-onepluslambda").click(() => loadExample("onepluslambda"));
$("#example-onelambda").click(() => loadExample("onelambda"));
$("#example-multithread").click(() => loadExample("multithread"));
$("#example-full-multithread").click(() => loadExample("full_multithread"));
$("#example-multithread-performance").click(() =>
  loadExample("multithread-performance")
);

$("#upload_xml").click(() => $("#upload_xml_input").click());
$("#upload_xml_input").change(selectedFileChanged);
$("#promt_for_xml").click(promptForXML);
$("#download_xml").click(downloadWorkspace);
$("#copy_xml").click(copyXMLToClipboard);
$("#download_js").click(downloadWorkspaceAsJS);
$("#show_js").click(highlightAll);
$("#download_json").click(tryDownloadLog);
$("#download_csv").click(tryDownloadCSV);

// Align the output column to the height of the workspace
$("#output-column").height($("#blockly-div").height());

// remove loading icon and show content
document.getElementById("spinner").style.display = "none";
document.getElementById("workspace-content").style.opacity = "1.0";

// Add a output entry to show printing statements
function addPrintOutput() {
  // Check existsence of output entry for printing statements
  if ($("#output-print-area").length)
    return document.getElementById("output-print-area");
  return addNewOutputEntry(
    '<pre id="output-print-area" class="print-area"></pre>',
    "output-print-area",
    "Output"
  );
}
addPrintOutput();

function clearOutput() {
  if (
    confirm(
      "Everything in the Output-Column and the content of the CSV- and IOHAnalyzer-files will be deleted. \n Continue?"
    )
  ) {
    clearCSV();
    clearLog();
    clearPlots();
    $("#output-column").empty();
  }
}

// Generates a new output entry containing
// - a shown outputContent as HTML-String
// - the id of the div with the outputContent in the future HTML file
// - the title of the output entry
// returns the html element inside of the output entry
function addNewOutputEntry(outputContent, outputContentID, title) {
  let numOutput = $("#output-column > *").length;
  let divString = `
  <div class="output-block" id="output-${numOutput}">
    <div class="output-header">
      <h3 class="output-heading" id="output-${numOutput}-heading">${title}</h3>
      <button class="btn btn-outline-dark btn-block" id="output-${numOutput}-button">Hide</button>
    </div>
    <div id="output-${numOutput}-content">
      ${outputContent}
    </div>
  </div>`;
  $("#output-column").append(divString);
  // Add a button to toggle between showing and hiding the output entry
  $(`#output-${numOutput}-button`).click(() => {
    let newButtonValue = "Show";
    if ($(`#output-${numOutput}-button`).text() == "Show")
      newButtonValue = "Hide";
    $(`#output-${numOutput}-button`).text(newButtonValue);
    $(`#output-${numOutput}-content`).slideToggle(300);
  });
  return document.getElementById(outputContentID);
}

function tryDownloadCSV() {
  if (hasCSVEntries()) downloadCSV();
  else
    alert(
      "The CSV file is empty. Use the CSV-Block in logging to save data in it."
    );
}

function tryDownloadLog() {
  if (hasLogEntries()) downloadLog();
  else alert("The IOHAnalyzer file is empty.");
}

export { addPrintOutput, addNewOutputEntry };
