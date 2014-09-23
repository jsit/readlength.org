/**
 * wordcount.js
 *
 * This is a modification of readability.js from 
 * http://code.google.com/p/arc90labs-readability
 *
 */

var dbg = function(s) {
	if(typeof console !== 'undefined')
		console.log("Readability: " + s);
};

var readability = {
	
	regexps: {//{{{
	/**
	 * All of the regular expressions in use within readability.
	 * Defined up here so we don't instantiate them repeatedly in loops.
	 **/
		unlikelyCandidatesRe:   /combx|comment|disqus|foot|header|menu|meta|nav|rss|shoutbox|sidebar|sponsor/i,
		okMaybeItsACandidateRe: /and|article|body|column|main|text/i,
		positiveRe:             /article|body|content|entry|hentry|page|pagination|post|text/i,
		negativeRe:             /combx|comment|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|tags|widget/i,
		divToPElementsRe:       /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
		replaceBrsRe:           /(<br[^>]*>[ \n\r\t]*){2,}/gi,
		replaceFontsRe:         /<(\/?)font[^>]*>/gi,
		trimRe:                 /^\s+|\s+$/g,
		normalizeRe:            /\s{2,}/g,
		killBreaksRe:           /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
		videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i
	},//}}}

	init: function(preserveUnlikelyCandidates) {//{{{
		preserveUnlikelyCandidates = (typeof preserveUnlikelyCandidates == 'undefined') ? false : preserveUnlikelyCandidates;

		var articleContent = readability.grabArticle(preserveUnlikelyCandidates);

		/**
		 * If we attempted to strip unlikely candidates on the first run through, and we ended up with no content,
		 * that may mean we stripped out the actual content so we couldn't parse it. So re-run init while preserving
		 * unlikely candidates to have a better shot at getting our content out properly.
		**/
		if(readability.getInnerText(articleContent, false) == "")
		{
			if(!preserveUnlikelyCandidates) {
				return readability.init(true);				
			}
			else
			{
				// articleContent.innerHTML = "<p>Sorry, readability was unable to parse this page for content. If you feel like it should have been able to, please <a href='http://code.google.com/p/arc90labs-readability/issues/entry'>let us know by submitting an issue.</a></p>";
				alert("wordcount.it estimate:\n\nSorry, no article detected.");
			}
		}

		/**
		 * Get the total words and total reading time and "alert" them to the
		 * user
		 */
		readingWords = readability.getTextNodesIn(articleContent);
		readingTime = readingWords / 250; /* People read about 250 words a minute */
		readingTimeFormatted = Math.max(1,Math.round(readingTime));

		if (readingTimeFormatted == 1) readingTimeNumber = "minute"; else readingTimeNumber = "minutes";

		if (readingWords > 0)
			alert("wordcount.it estimate:\n\n" + readingWords + " words\n" + readingTimeFormatted + " " + readingTimeNumber);

	},//}}}

	getTextNodesIn: function(element) {//{{{
	// Stolen from
	// https://gist.github.com/darkliquid/5244870#file-beautified-js-L17
		var wordcount = 0,
		whitespace = /^\s*$/;

		function getTextNode(node) {
		  // type 3 is a textnode
		  if (node.nodeType == 3) {
			// We skip text nodes that are only whitespace
			if (!whitespace.test(node.nodeValue)) {
			  wordcount += node.nodeValue.split(" ").length;
			}
			// this isn't a text node, so test each childnode
		  } else {
			for (var i = 0, len = node.childNodes.length; i < len; ++i) {
			  getTextNode(node.childNodes[i]);
			}
		  }
		}
		getTextNode(element);
		return wordcount;
	  }, //}}}
	
	prepArticle: function (articleContent) {//{{{
	/**
	 * Prepare the article node for display. Clean out any inline styles,
	 * iframes, forms, strip extraneous <p> tags, etc.
	 *
	 * @param Element
	 * @return void
	 **/
		readability.cleanStyles(articleContent);
		readability.killBreaks(articleContent);

		/* Clean out junk from the article content */
		readability.clean(articleContent, "form");
		readability.clean(articleContent, "object");
		readability.clean(articleContent, "h1");
		/**
		 * If there is only one h2, they are probably using it
		 * as a header and not a subheader, so remove it since we already have a header.
		***/
		if(articleContent.getElementsByTagName('h2').length == 1)
			readability.clean(articleContent, "h2");
		readability.clean(articleContent, "iframe");

		readability.cleanHeaders(articleContent);

		/* Do these last as the previous stuff may have removed junk that will affect these */
		readability.cleanConditionally(articleContent, "table");
		readability.cleanConditionally(articleContent, "ul");
		readability.cleanConditionally(articleContent, "div");

		/* Remove extra paragraphs */
		var articleParagraphs = articleContent.getElementsByTagName('p');
		for(i = articleParagraphs.length-1; i >= 0; i--)
		{
			var imgCount    = articleParagraphs[i].getElementsByTagName('img').length;
			var embedCount  = articleParagraphs[i].getElementsByTagName('embed').length;
			var objectCount = articleParagraphs[i].getElementsByTagName('object').length;
			
			if(imgCount == 0 && embedCount == 0 && objectCount == 0 && readability.getInnerText(articleParagraphs[i], false) == '')
			{
				articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
			}
		}

		try {
			articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');		
		}
		catch (e) {
			// dbg("Cleaning innerHTML of breaks failed. This is an IE strict-block-elements bug. Ignoring.");
		}
	},//}}}
	
	initializeNode: function (node) {//{{{
	/**
	 * Initialize a node with the readability object. Also checks the
	 * className/id for special names to add to its score.
	 *
	 * @param Element
	 * @return void
	**/
		node.readability = {"contentScore": 0};			

		switch(node.tagName) {
			case 'DIV':
				node.readability.contentScore += 5;
				break;

			case 'PRE':
			case 'TD':
			case 'BLOCKQUOTE':
				node.readability.contentScore += 3;
				break;
				
			case 'ADDRESS':
			case 'OL':
			case 'UL':
			case 'DL':
			case 'DD':
			case 'DT':
			case 'LI':
			case 'FORM':
				node.readability.contentScore -= 3;
				break;

			case 'H1':
			case 'H2':
			case 'H3':
			case 'H4':
			case 'H5':
			case 'H6':
			case 'TH':
				node.readability.contentScore -= 5;
				break;
		}

		node.readability.contentScore += readability.getClassWeight(node);
	},//}}}
	
	grabArticle: function (preserveUnlikelyCandidates) {//{{{
	/***
	 * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
	 *               most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
	 *
	 * @return Element
	**/
		/**
		 * First, node prepping. Trash nodes that look cruddy (like ones with the class name "comment", etc), and turn divs
		 * into P tags where they have been used inappropriately (as in, where they contain no other block level elements.)
		 *
		 * Note: Assignment from index for performance. See http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5
		 * TODO: Shouldn't this be a reverse traversal?
		**/
		for(var nodeIndex = 0; (node = document.getElementsByTagName('*')[nodeIndex]); nodeIndex++)
		{
			/* Remove unlikely candidates */
			if (!preserveUnlikelyCandidates) {
				var unlikelyMatchString = node.className + node.id;
				if (unlikelyMatchString.search(readability.regexps.unlikelyCandidatesRe) !== -1 &&
				    unlikelyMatchString.search(readability.regexps.okMaybeItsACandidateRe) == -1 &&
					node.tagName !== "BODY")
				{
					// dbg("Removing unlikely candidate - " + unlikelyMatchString);
					// node.parentNode.removeChild(node);
					// nodeIndex--;
					// continue;
				}				
			}

		}

		/**
		 * Loop through all paragraphs, and assign a score to them based on how content-y they look.
		 * Then add their score to their parent node.
		 *
		 * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
		**/
		var allParagraphs = document.getElementsByTagName("p");
		var candidates    = [];

		for (var j=0; j	< allParagraphs.length; j++) {
			var parentNode      = allParagraphs[j].parentNode;
			var grandParentNode = parentNode.parentNode;
			var innerText       = readability.getInnerText(allParagraphs[j]);

			/* If this paragraph is less than 25 characters, don't even count it. */
			if(innerText.length < 25)
				continue;

			/* Initialize readability data for the parent. */
			if(typeof parentNode.readability == 'undefined')
			{
				readability.initializeNode(parentNode);
				candidates.push(parentNode);
			}

			/* Initialize readability data for the grandparent. */
			if(typeof grandParentNode.readability == 'undefined')
			{
				readability.initializeNode(grandParentNode);
				candidates.push(grandParentNode);
			}

			var contentScore = 0;

			/* Add a point for the paragraph itself as a base. */
			contentScore++;

			/* Add points for any commas within this paragraph */
			contentScore += innerText.split(',').length;
			
			/* For every 100 characters in this paragraph, add another point. Up to 3 points. */
			contentScore += Math.min(Math.floor(innerText.length / 100), 3);
			
			/* Add the score to the parent. The grandparent gets half. */
			parentNode.readability.contentScore += contentScore;
			grandParentNode.readability.contentScore += contentScore/2;
		}

		/**
		 * After we've calculated scores, loop through all of the possible candidate nodes we found
		 * and find the one with the highest score.
		**/
		var topCandidate = null;
		for(var i=0, il=candidates.length; i < il; i++)
		{
			/**
			 * Scale the final candidates score based on link density. Good content should have a
			 * relatively small link density (5% or less) and be mostly unaffected by this operation.
			**/
			candidates[i].readability.contentScore = candidates[i].readability.contentScore * (1-readability.getLinkDensity(candidates[i]));

			// dbg('Candidate: ' + candidates[i] + " (" + candidates[i].className + ":" + candidates[i].id + ") with score " + candidates[i].readability.contentScore);

			if(!topCandidate || candidates[i].readability.contentScore > topCandidate.readability.contentScore)
				topCandidate = candidates[i];
		}

		/**
		 * If we still have no top candidate, just use the body as a last resort.
		 * We also have to copy the body node so it is something we can modify.
		 **/
		if (topCandidate == null || topCandidate.tagName == "BODY")
		{
			topCandidate = document.createElement("DIV");
			topCandidate.innerHTML = document.body.innerHTML;
			document.body.innerHTML = "";
			document.body.appendChild(topCandidate);
			readability.initializeNode(topCandidate);
		}


		/**
		 * Now that we have the top candidate, look through its siblings for content that might also be related.
		 * Things like preambles, content split by ads that we removed, etc.
		**/
		var articleContent        = document.createElement("DIV");
	        articleContent.id     = "readability-content";
		var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
		var siblingNodes          = topCandidate.parentNode.childNodes;
		for(var i=0, il=siblingNodes.length; i < il; i++)
		{
			var siblingNode = siblingNodes[i];
			var append      = false;

			// dbg("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.readability != 'undefined') ? (" with score " + siblingNode.readability.contentScore) : ''));
			// dbg("Sibling has score " + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

			if(siblingNode === topCandidate)
			{
				append = true;
			}
			
			if(typeof siblingNode.readability != 'undefined' && siblingNode.readability.contentScore >= siblingScoreThreshold)
			{
				append = true;
			}
			
			if(siblingNode.nodeName == "P") {
				var linkDensity = readability.getLinkDensity(siblingNode);
				var nodeContent = readability.getInnerText(siblingNode);
				var nodeLength  = nodeContent.length;
				
				if(nodeLength > 80 && linkDensity < 0.25)
				{
					append = true;
				}
				else if(nodeLength < 80 && linkDensity == 0 && nodeContent.search(/\.( |$)/) !== -1)
				{
					append = true;
				}
			}

			if(append)
			{
				// dbg("Appending node: " + siblingNode)

				/* Make a copy of the winning sibling and put it into our Readability div. */
				copyOfSibling = siblingNode.cloneNode(true);
				articleContent.appendChild(copyOfSibling);
				i++;
			}
		}				

		/**
		 * So we have all of the content that we need. Now we clean it up for presentation.
		**/
		readability.prepArticle(articleContent);

		/**
		 * Here we have to delete all the candidates' readability objects so
		 * that we can click the bookmarklet twice if we want to. [wordcount.it]
		 */
		for(var i=0, il=candidates.length; i < il; i++) { delete candidates[i].readability; }
		
		return articleContent;
	},//}}}
	
	getInnerText: function (e, normalizeSpaces) {//{{{
	/**
	 * Get the inner text of a node - cross browser compatibly.
	 * This also strips out any excess whitespace to be found.
	 *
	 * @param Element
	 * @return string
	**/
		var textContent    = "";

		normalizeSpaces = (typeof normalizeSpaces == 'undefined') ? true : normalizeSpaces;

		if (navigator.appName == "Microsoft Internet Explorer")
			textContent = e.innerText.replace( readability.regexps.trimRe, "" );
		else
			textContent = e.textContent.replace( readability.regexps.trimRe, "" );

		if(normalizeSpaces)
			return textContent.replace( readability.regexps.normalizeRe, " ");
		else
			return textContent;
	},//}}}

	getCharCount: function (e,s) {//{{{
	/**
	 * Get the number of times a string s appears in the node e.
	 *
	 * @param Element
	 * @param string - what to split on. Default is ","
	 * @return number (integer)
	**/
	    s = s || ",";
		return readability.getInnerText(e).split(s).length;
	},//}}}

	cleanStyles: function (e) {//{{{
	/**
	 * Remove the style attribute on every e and under.
	 * TODO: Test if getElementsByTagName(*) is faster.
	 *
	 * @param Element
	 * @return void
	**/
	    e = e || document;
	    var cur = e.firstChild;

		if(!e)
			return;

		// Remove any root styles, if we're able.
		if(typeof e.removeAttribute == 'function' && e.className != 'readability-styled')
			e.removeAttribute('style');

	    // Go until there are no more child nodes
	    while ( cur != null ) {
			if ( cur.nodeType == 1 ) {
				// Remove style attribute(s) :
				if(cur.className != "readability-styled") {
					cur.removeAttribute("style");					
				}
				readability.cleanStyles( cur );
			}
			cur = cur.nextSibling;
		}			
	},//}}}
	
	getLinkDensity: function (e) {//{{{
	/**
	 * Get the density of links as a percentage of the content
	 * This is the amount of text that is inside a link divided by the total text in the node.
	 * 
	 * @param Element
	 * @return number (float)
	**/
		var links      = e.getElementsByTagName("a");
		var textLength = readability.getInnerText(e).length;
		var linkLength = 0;
		for(var i=0, il=links.length; i<il;i++)
		{
			linkLength += readability.getInnerText(links[i]).length;
		}		

		return linkLength / textLength;
	},//}}}
	
	getClassWeight: function (e) {//{{{
	/**
	 * Get an elements class/id weight. Uses regular expressions to tell if this 
	 * element looks good or bad.
	 *
	 * @param Element
	 * @return number (Integer)
	**/
		var weight = 0;

		/* Look for a special classname */
		if (e.className != "")
		{
			if(e.className.search(readability.regexps.negativeRe) !== -1)
				weight -= 25;

			if(e.className.search(readability.regexps.positiveRe) !== -1)
				weight += 25;				
		}

		/* Look for a special ID */
		if (typeof(e.id) == 'string' && e.id != "")
		{
			if(e.id.search(readability.regexps.negativeRe) !== -1)
				weight -= 25;

			if(e.id.search(readability.regexps.positiveRe) !== -1)
				weight += 25;				
		}

		return weight;
	},//}}}
	
	killBreaks: function (e) {//{{{
	/**
	 * Remove extraneous break tags from a node.
	 *
	 * @param Element
	 * @return void
	 **/
		try {
			e.innerHTML = e.innerHTML.replace(readability.regexps.killBreaksRe,'<br />');		
		}
		catch (e) {
			// dbg("KillBreaks failed - this is an IE bug. Ignoring.");
		}
	},//}}}

	clean: function (e, tag) {//{{{
	/**
	 * Clean a node of all elements of type "tag".
	 * (Unless it's a youtube/vimeo video. People love movies.)
	 *
	 * @param Element
	 * @param string tag to clean
	 * @return void
	 **/
		var targetList = e.getElementsByTagName( tag );
		var isEmbed    = (tag == 'object' || tag == 'embed');

		for (var y=targetList.length-1; y >= 0; y--) {
			/* Allow youtube and vimeo videos through as people usually want to see those. */
			if(isEmbed && targetList[y].innerHTML.search(readability.regexps.videoRe) !== -1)
			{
				continue;
			}

			targetList[y].parentNode.removeChild(targetList[y]);
		}
	},//}}}
	
	cleanConditionally: function (e, tag) {//{{{
	/**
	 * Clean an element of all tags of type "tag" if they look fishy.
	 * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
	 *
	 * @return void
	 **/
		var tagsList      = e.getElementsByTagName(tag);
		var curTagsLength = tagsList.length;

		/**
		 * Gather counts for other typical elements embedded within.
		 * Traverse backwards so we can remove nodes at the same time without effecting the traversal.
		 *
		 * TODO: Consider taking into account original contentScore here.
		**/
		for (var i=curTagsLength-1; i >= 0; i--) {
			var weight = readability.getClassWeight(tagsList[i]);

			// dbg("Cleaning Conditionally " + tagsList[i] + " (" + tagsList[i].className + ":" + tagsList[i].id + ")" + ((typeof tagsList[i].readability != 'undefined') ? (" with score " + tagsList[i].readability.contentScore) : ''));

			if(weight < 0)
			{
				tagsList[i].parentNode.removeChild(tagsList[i]);
			}
			else if ( readability.getCharCount(tagsList[i],',') < 10) {
				/**
				 * If there are not very many commas, and the number of
				 * non-paragraph elements is more than paragraphs or other ominous signs, remove the element.
				**/

				var p      = tagsList[i].getElementsByTagName("p").length;
				var img    = tagsList[i].getElementsByTagName("img").length;
				var li     = tagsList[i].getElementsByTagName("li").length-100;
				var input  = tagsList[i].getElementsByTagName("input").length;

				var embedCount = 0;
				var embeds     = tagsList[i].getElementsByTagName("embed");
				for(var ei=0,il=embeds.length; ei < il; ei++) {
					if (embeds[ei].src.search(readability.regexps.videoRe) == -1) {
					  embedCount++;	
					}
				}

				var linkDensity   = readability.getLinkDensity(tagsList[i]);
				var contentLength = readability.getInnerText(tagsList[i]).length;
				var toRemove      = false;

				if ( img > p ) {
				 	toRemove = true;
				} else if(li > p && tag != "ul" && tag != "ol") {
					toRemove = true;
				} else if( input > Math.floor(p/3) ) {
				 	toRemove = true; 
				} else if(contentLength < 25 && (img == 0 || img > 2) ) {
					toRemove = true;
				} else if(weight < 25 && linkDensity > .2) {
					toRemove = true;
				} else if(weight >= 25 && linkDensity > .5) {
					toRemove = true;
				} else if((embedCount == 1 && contentLength < 75) || embedCount > 1) {
					toRemove = true;
				}

				if(toRemove) {
					tagsList[i].parentNode.removeChild(tagsList[i]);
				}
			}
		}
	},//}}}

	cleanHeaders: function (e) {//{{{
	/**
	 * Clean out spurious headers from an Element. Checks things like classnames and link density.
	 *
	 * @param Element
	 * @return void
	**/
		for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
			var headers = e.getElementsByTagName('h' + headerIndex);
			for (var i=headers.length-1; i >=0; i--) {
				if (readability.getClassWeight(headers[i]) < 0 || readability.getLinkDensity(headers[i]) > 0.33) {
					headers[i].parentNode.removeChild(headers[i]);
				}
			}
		}
	},//}}}
	
	htmlspecialchars: function (s) {//{{{
		if (typeof(s) == "string") {
			s = s.replace(/&/g, "&amp;");
			s = s.replace(/"/g, "&quot;");
			s = s.replace(/'/g, "&#039;");
			s = s.replace(/</g, "&lt;");
			s = s.replace(/>/g, "&gt;");
		}
	
		return s;
	}//}}}
	
};

readability.init();
