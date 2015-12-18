// run to reset:
// localStorage.removeItem('visited-' + location.pathname);


// Global variables are fun!
var commentCountText, commentsList, divDiv;



// *** General utility functions

function $$(selector, context) {
  /* Return descendant of `context` matching the given `selector` */
  // inspired from http://libux.co/useful-function-making-queryselectorall-like-jquery/
  context = context || document;
  if (!context.querySelectorAll) {
    return [];
  }
  var elements = context.querySelectorAll(selector);
  return Array.prototype.slice.call(elements);
}

function $(selector, context) {
  /* Return first descendant of `context` matching the given `selector` */
  context = context || document;
  if (!context.querySelector) {
    return undefined;
  }
  return context.querySelector(selector);
}



// *** Date utility functions

function time_fromHuman(string) {
  /* Convert a human-readable date into a JS timestamp */
  if (string.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
    string = string.replace(' ', 'T');  // revert nice spacing
    string += ':00.000Z';  // complete ISO 8601 date
    time = Date.parse(string);  // milliseconds since epoch

    // browsers handle ISO 8601 without explicit timezone differently
    // thus, we have to fix that by hand
    time += (new Date()).getTimezoneOffset() * 60e3;
  }
  else {
    string = string.replace(' at', '');
    time = Date.parse(string);  // milliseconds since epoch
  }
  return time;
}

function time_toHuman(time) {
  /* Convert a JS timestamp into a human-readable date */

  // note: time is milliseconds since epoch

  // keep client offset from messing with server time
  time -= (new Date()).getTimezoneOffset() * 60e3;

  date = new Date(time);
  string = date.toISOString();  // to ISO 8601
  string = string.slice(0, 16);  // remove seconds, milliseconds and UTC mark
  string = string.replace('T', ' ');  // use more readable separator
  return string;
}



// *** Comment utility functions

function comment_id(comment) {
  /* Return HTML identifier of `comment` */
  return comment.id.split('-').pop();
}

function comment_author(comment) {
  /* Return author of `comment` */
  return $('cite', comment).textContent;
}

function comment_time(comment) {
  /* Return publication date of `comment` */
  return time_fromHuman($('.comment-meta a', comment).textContent);
}

function comment_isHidden(comment) {
  /* Return whether `comment` is shown */
  return comment.classList.contains('hidden-comment');
}

function comment_go(comment) {
  /* Focus on `comment` */
  if (!comment) {
    return;
  }

  var scrollX = window.scrollX, scrollY = window.scrollY;
  location.replace('#comment-' + comment_id(comment));
  // redo the scroll, smoothly (Firefox only)
  window.scroll(scrollX, scrollY);
  comment.scrollIntoView({block: "start", behavior: "smooth"});
}

function comment_toggleVisibility(comment) {
  /* Toggle visbility of `comment` */
  if (comment_isHidden(comment)) {
    comment.classList.remove('hidden-comment');
    $('.comment-toggle-link', comment).textContent = 'Hide';
  }
  else {
    comment.classList.add('hidden-comment');
    $('.comment-toggle-link', comment).textContent = 'Show';
  }
}



// *** Functions to navigate comments

function comment_firstChild(comment) {
  /* Return first immediate child of `comment` */
  comment = comment || $('#comments');

  if (comment_isHidden(comment)) {
    return undefined;
  }

  return $('.comment', comment);
}

function comment_lastChild(comment) {
  /* Return last immediate child of `comment` */
  comment = comment || $('#comments');

  if (comment_isHidden(comment)) {
    return undefined;
  }

  return $$('#' + comment.id + '>*>.comment', comment).pop();
}

function comment_firstDescendant(comment) {
  /* Return first descendant of `comment` */
  return comment_firstChild(comment);
}

function comment_lastDescendant(comment) {
  /* Return last descendant of `comment` */
  var lastChild = comment_lastChild(comment);
  return lastChild ? comment_lastDescendant(lastChild) : comment;
}

function comment_nextSibling(comment) {
  /* Return next comment of the thread at the same depth */
  // ~ instead of + because pingbacks interleaved with comments
  return $('#' + comment.id + ' ~ .comment');
}

function comment_previousSibling(comment) {
  /* Return previous comment of the thread at the same depth */
  // no CSS selector so we do it by hand
  for (var sibling = comment.previousSibling; sibling; sibling = sibling.previousSibling) {
    if (sibling.classList && sibling.classList.contains('comment')) {
      return sibling;
    }
  }
  return undefined;
}

function comment_parent(comment) {
  /* Return parent of `comment` */
  var parent = comment.parentNode.parentNode;
  if (parent.classList.contains('comment')) {
    return parent;
  }
  return undefined;
}

function comment_nextThread(comment) {
  /* Return next thread */
  if (!comment) {
    return undefined;
  }

  // either next sibling or parent's next thread
  return comment_nextSibling(comment) || comment_nextThread(comment_parent(comment));
}

function comment_previousThread(comment) {
  /* Return previous thread */
  var sibling = comment_previousSibling(comment);
  if (!sibling) {
    return undefined;
  }

  if (comment_isHidden(sibling)) {
    return sibling;
  }

  return comment_lastDescendant(sibling) || sibling;
}

function comment_next(comment) {
  /* Return visually succeeding comment */
  return comment_firstChild(comment) || comment_nextThread(comment);
}

function comment_previous(comment) {
  /* Return visually preceding comment */
  return comment_previousThread(comment) || comment_parent(comment);
}



// *** Sets up borders and populates comments list

function comment_selectSince(since) {
  /* Select and list comments published since `since` */
  var mostRecent = since;
  var newComments = [];

  // update input field
  $('.date-input').value = time_toHuman(since);

  // Walk comments, setting borders as appropriate and saving new comments in a list
  $$('.commentholder').forEach(function(comment) {
    var postTime = comment_time(comment);
    if (postTime > since) {
      comment.classList.add('new-comment');
      newComments.push({time: postTime, ele: comment});
      if (postTime > mostRecent) {
        mostRecent = postTime;
      }
    }
    else {
      comment.classList.remove('new-comment');
    }
  });
  var newCount = newComments.length;

  // Populate the floating comment list
  commentCountText.data = '' + newCount + ' comment' + (newCount == 1 ? '' : 's') + ' since ';
  commentsList.textContent = '';
  if (newCount > 0) {
    divDiv.style.display = 'block';
    newComments.sort(function(a, b){return a.time - b.time;});
    newComments.forEach(function(comment) {
      var ele = comment.ele;
      var newLi = document.createElement('li');
      newLi.innerHTML = comment_author(comment.ele) + ' <span class="comments-date">' + time_toHuman(comment.time) + '</span>';
      newLi.className = 'comment-list-item';
      newLi.addEventListener('click', function(ele){return function(){ele.scrollIntoView(true);};}(ele));
      commentsList.appendChild(newLi);
    });
  }
  else {
    divDiv.style.display = 'none';
  }
  return mostRecent;
}

function newCommentList_init() {
  /* Set up comment list and highlighting */

  // Inject some css used by the floating list
  var styleEle = document.createElement('style');
  styleEle.type = 'text/css';
  styleEle.textContent = '.new-comment { border: 2px solid #5a5; }' +
  '.hidden-comment { opacity: .6; }' +
  '.hidden-comment .comment-meta, .hidden-comment .comment-body, .hidden-comment>.children { display: none; }' +
  '.new-text { color: #C5C5C5; display: none; }' +
  '.new-comment .new-text { display: inline; }' +
  '.comments-floater { position: fixed; right: 4px; top: 4px; padding: 2px 5px; font-size: 14px; border-radius: 5px; background: rgba(250, 250, 250, 0.90); }' +
  // available space on the right = right bar (230px) + page margin ((screen.width - #pjgm-wrap.width) / 2)
  '                             .comments-floater { max-width: calc(230px + (100% - 1258px) / 2); }' +
  '@media (max-width: 1274px) { .comments-floater { max-width: calc(230px + (100% - 1195px) / 2); } }' +
  '@media (max-width: 1214px) { .comments-floater { max-width: calc(230px + (100% - 1113px) / 2); } }' +
  '@media (max-width: 1134px) { .comments-floater { max-width: calc(230px + (100% -  866px) / 2); } }' +
  // at some point, it must cover the main content, we just keep space for [+] / [-]
  '@media (max-width: 1023px) { .comments-floater { max-width: calc(100% - 40px); } }' +
  '.comments-scroller { word-wrap: break-word; max-height: 80vh; overflow-y: scroll; }' +
  '.comment-list-item { cursor: pointer; clear: both; }' +
  '.comments-date { font-size: 11px; display: block; }' +
  '@media (min-width:900px) { .comments-date { display: inline-block; text-align: right; float: right; padding-right: 1em; } }' +
  '.cct-span { white-space: nowrap; }' +
  // the full date will fit the input on large screens; on smaller screens, it will shrink to avoid wrapping
  '.date-input { margin-left: .5em; min-width: 3ex; max-width: 10em; width: calc(100% - 153px); }' +
  '@media (max-width: 300px) { .date-input { width: auto; } }' +
  '.hider { position: absolute; left: -25px; top: 6px; display: inline-block; width: 25px; text-align: center; }' +
  '.hider::before { content: "["; float: left; }' +
  '.hider::after { content: "]"; float: right; }' +
  '';
  document.head.appendChild(styleEle);


  // *** Create and insert the floating list of comments, and its contents


  // The floating box.
  var floatBox = document.createElement('div');
  floatBox.className = 'comments-floater';


  // Container for the text node below.
  var cctSpan = document.createElement('span');
  cctSpan.className = 'cct-span';

  // The text node which says 'x comments since'
  commentCountText = document.createTextNode('');

  // The text box with the date.
  var dateInput = document.createElement('input');
  dateInput.className = 'date-input';
  dateInput.addEventListener('blur', function(e) {
    var newDate = time_fromHuman(dateInput.value);
    if (isNaN(newDate)) {
      alert(
        'Sorry, I do not understand “' + dateInput.value + '”.\n' +
        'Please use either “YYYY-MM-DD HH:mm”\n' +
        'or the same format as in comments.'
      );
      return;
    }
    comment_selectSince(newDate);
  });
  dateInput.addEventListener('keypress', function(e) {
    if (e.keyCode === 13) {
      dateInput.blur();
    }
  });


  // Container for the comments list and the '[+]'
  divDiv = document.createElement('div');
  divDiv.style.display = 'none';

  // Scrollable container for the comments list
  var commentsScroller = document.createElement('div');
  commentsScroller.className = 'comments-scroller';
  commentsScroller.style.display = 'none';

  // The '[+]'
  var hider = document.createElement('span');
  hider.textContent = '+';
  hider.className = 'hider';
  hider.addEventListener('click', function(e) {
    if (commentsScroller.style.display != 'none') {
      commentsScroller.style.display = 'none';
      hider.textContent = '+';
    }
    else {
      commentsScroller.style.display = '';
      hider.textContent = '-';
    }
  });

  // Actual list of comments
  commentsList = document.createElement('ul');


  // Insert all the things we made into each other and ultimately the document.

  cctSpan.appendChild(commentCountText);
  floatBox.appendChild(cctSpan);

  floatBox.appendChild(dateInput);

  divDiv.appendChild(hider);
  commentsScroller.appendChild(commentsList);
  divDiv.appendChild(commentsScroller);
  floatBox.appendChild(divDiv);

  document.body.appendChild(floatBox);


  // *** Retrieve the last-visit time from storage, border all comments made after, and save the time of the latest comment in storage for next time

  var pathString = 'visited-' + location.pathname;
  var lastVisit = parseInt(localStorage[pathString]);
  if (isNaN(lastVisit)) {
    lastVisit = 0; // prehistory! Actually 1970, which predates all SSC comments, so we're good.
  }
  localStorage[pathString] = comment_selectSince(lastVisit);
}



// *** Comment tool links

function comment_actionHide(comment) {
  /* Create Hide/Show action link for `comment` */
  var hideLink = document.createElement('a');
  hideLink.className = 'comment-toggle-link';
  hideLink.style.textDecoration = 'underline';
  hideLink.style.cursor = 'pointer';
  hideLink.textContent = 'Hide';
  hideLink.addEventListener('click', function(e) { comment_toggleVisibility(comment); });
  return hideLink;
}

function comment_actionParent(comment) {
  /* Create parent action link for `comment` */

  var parent = comment_parent(comment);
  if (!parent) {
    return;
  }

  var parentLink = document.createElement('a');
  parentLink.href = '#comment-' + comment_id(parent);
  parentLink.className = 'comment-reply-link';
  parentLink.style.textDecoration = 'underline';
  parentLink.title = 'Parent comment';
  parentLink.textContent = '↑';
  return parentLink;
}

function comment_actionNewer(comment) {
  /* Create newer action link for `comment` */
  var newerLink = document.createElement('a');
  newerLink.textContent = 'Newer';
  newerLink.style.textDecoration = 'underline';
  newerLink.onclick = function(e) { comment_selectSince(comment_time(comment)); };
  return newerLink;
}

function comment_addActions(comment) {
  /* Add more actions to `comment` */
  var replyEle = $('.reply', comment);

  // hide/show action
  replyEle.appendChild(document.createTextNode(' '));
  replyEle.appendChild(comment_actionHide(comment));

  // newer action
  replyEle.appendChild(document.createTextNode(' '));
  replyEle.appendChild(comment_actionNewer(comment));

  // parent action
  var actionParent = comment_actionParent(comment);
  if (actionParent) {
    replyEle.appendChild(document.createTextNode(' '));
    replyEle.appendChild(actionParent);
  }

  // ~new~ marker (not an action)
  var newText = document.createElement('span');
  newText.className = 'new-text';
  newText.textContent = '~new~';
  $('div.comment-meta', comment).appendChild(newText);
}



// *** Keyboard navigation

function eventKey(e) {
  /* Return the character of a keyboard event */

  if (e.key) {
    return e.key;
  }

  var key = String.fromCharCode(e.keyCode);
  if (!e.shiftKey) {
    key = key.toLowerCase();
  }

  return key;
}

function commentNavigation(e) {
  /* Keyboard comment navigation */
  if (e.keyCode == 27) {
    document.activeElement.blur();
    return;
  }

  if (e.target != document.body) {
    return;
  }

  if (e.ctrlKey || e.altKey) {
    return;
  }

  var key = eventKey(e);

  var comment = undefined;
  if (location.hash) {
    comment = $('#li-' + location.hash.slice(1) + '.comment');
  }

  if (comment) {
    switch (key) {  // comment is selected
      case 'g': comment_go(comment_firstChild     ()); break;
      case 'G': comment_go(comment_lastChild      ()); break;
      case 'j': comment_go(comment_next           (comment)); break;
      case 'J': comment_go(comment_nextSibling    (comment)); break;
      case 'k': comment_go(comment_previous       (comment)); break;
      case 'K': comment_go(comment_previousSibling(comment)); break;
      case 'p': comment_go(comment_parent         (comment)); break;
      case 'm': comment_toggleVisibility(comment); break;
    }
  }
  else {  // no selected comment
    switch (key) {
      case 'j':
      case 'J':
      case 'g': comment_go(comment_firstChild()); break;
      case 'G': comment_go(comment_lastChild ()); break;
    }
  }
}

// Run on pages with comments
if ($('#comments')) {
  newCommentList_init();
  $$('.comment').forEach(comment_addActions);
  document.addEventListener('keydown', commentNavigation);
}



// *** Boustrophedon: alternate reading direction of lines */
// see http://slatestarcodex.com/2015/03/31/rational-orthography-2/

function boustropheon(paragraph) {
  /* Apply boustrophedon transformation to given `paragraph` */

  paragraph.style.textAlign = 'justify';
  paragraph.style.position = 'relative';
  var compStyle = getComputedStyle(paragraph);
  var lineHeight = compStyle.lineHeight;
  lineHeight = parseInt(lineHeight.substring(0, lineHeight.length-2));
  var height = compStyle.height;
  height = parseInt(height.substring(0, height.length-2));

  var lines = height / lineHeight;

  var backbase = paragraph.cloneNode(true);
  backbase.style.position = 'absolute';
  backbase.style.top = '0px';
  backbase.style.left = '0px';
  if (false) {  // justChars
    backbase.style.unicodeBidi = 'bidi-override';
    backbase.style.direction = 'rtl';
  }
  else {
    backbase.style.transform = 'scale(-1, 1)';
    backbase.style['-webkit-transform'] = 'scale(-1, 1)';
  }
  backbase.style.background = 'white';

  for (var i=1; i<lines; i+=2) {
    var copy = backbase.cloneNode(true);
    copy.style.clip = 'rect(' + i*lineHeight + 'px, auto, ' + (i+1)*lineHeight + 'px, auto)';
    paragraph.appendChild(copy);
  }
}

// Run on posts with #boustrophedon marker
$$('#boustrophedon').forEach(function(marker) {
  var post = marker.parentNode.parentNode;
  $$('p', post).forEach(boustropheon);
});
