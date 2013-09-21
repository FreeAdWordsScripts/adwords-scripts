/**************************************
* Track Entity Creation Date
* Version 1.3
* Changelog v1.3
*  - Updated script to handle all entities
* Changelog v1.2
*  - Fixed an issue with comparing dates
* ChangeLog v1.1
*  - Updated logic to work with larger accounts
* Created By: Russ Savage
* http://www.FreeAdWordsScripts.com
**************************************/
//All my labels will start with this. For example: Created:2013-05-01
var LABEL_PREFIX = 'Created:';
var DAYS_IN_REPORT = 30;
var ENTITY = 'ad'; //or adgroup or keyword or campaign
 
function main() {
  //First we get the impression history of our entity
  var ret_map = getImpressionHistory();
  //Then we apply our labels
  applyLabels(ret_map);
}
 
//Function to apply labels to the ads in an account
function applyLabels(ret_map) {
  var iter;
  if(ENTITY === 'campaign') { iter = AdWordsApp.campaigns().get(); }
  if(ENTITY === 'adgroup') { iter = AdWordsApp.adGroups().get(); }
  if(ENTITY === 'ad') { iter = AdWordsApp.ads().get(); }
  if(ENTITY === 'keyword') { iter = AdWordsApp.keywords().get(); }
  
  while(iter.hasNext()) {
    var entity = iter.next();
    var id = entity.getId();
    if(ret_map[id]) {
      var label_name = LABEL_PREFIX+Utilities.formatDate(ret_map[id], AdWordsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
      createLabelIfNeeded(label_name);
      entity.applyLabel(label_name);
    }
  }
}
 
//This is a helper function to create the label if it does not already exist
function createLabelIfNeeded(name) {
  if(!AdWordsApp.labels().withCondition("Name = '"+name+"'").get().hasNext()) {
    AdWordsApp.createLabel(name);
  }
}
 
//A helper function to find the date days ago
function getDateDaysAgo(days) {
  var the_past = new Date();
  the_past.setDate(the_past.getDate() - days);
  return Utilities.formatDate(the_past,AdWordsApp.currentAccount().getTimeZone(),"yyyyMMdd");
}
 
//A helper function to compare dates.
//Copied from: http://goo.gl/uW48a
function diffDays(firstDate,secondDate) {
  var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
  return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay))); 
}
 
function getImpressionHistory() {
  var API_VERSION = { apiVersion: 'v201302', includeZeroImpressions : false };
  var first_date = new Date('10/23/2000');
  var max_days_ago = diffDays(first_date,new Date());
  var cols = ['Date','Id','Impressions'];
  var report = { 
    'campaign' : 'CAMPAIGN_PERFORMANCE_REPORT',
    'adgroup' : 'ADGROUP_PERFORMANCE_REPORT',
    'ad' : 'AD_PERFORMANCE_REPORT',
    'keyword' : 'KEYWORDS_PERFORMANCE_REPORT'}[ENTITY];
  var ret_map = {};
  var prev_days_ago = 0;
  for(var i = DAYS_IN_REPORT; i < max_days_ago; i+=DAYS_IN_REPORT) {
    var start_date = getDateDaysAgo(i);
    var end_date = getDateDaysAgo(prev_days_ago);
    var date_range = start_date+','+end_date;
    Logger.log('Getting data for ' + date_range);
    var query = ['select',cols.join(','),'from',report,'during',date_range].join(' ');
    var report_iter = AdWordsApp.report(query, API_VERSION).rows();
    if(!report_iter.hasNext()) { Logger.log('No more impressions found. Breaking.'); break; } // no more entries
    while(report_iter.hasNext()) { 
      var row = report_iter.next();
      if(ret_map[row['Id']]) {
        var [year,month,day] = (row['Date']).split('-');
        var from_row = new Date(year, parseFloat(month)-1, day);
        var from_map = ret_map[row['Id']];
         
        if(from_row < from_map) {
          ret_map[row['Id']] = from_row;
        }
      } else {
        var [year,month,day] = (row['Date']).split('-');
        ret_map[row['Id']] = new Date(year, parseFloat(month)-1, day);
      }
    }
    prev_days_ago = i;
  }
  return ret_map;
}
