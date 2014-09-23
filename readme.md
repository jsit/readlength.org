# wordcount.it

Get the word count and estimated reading time of an article on the web. No text selection required.

Pull requests welcome.

## Bookmarklet URI
    
    javascript:(function(){_wordcount_script=document.createElement('SCRIPT');_wordcount_script.type='text/javascript';_wordcount_script.src='http://wordcount.it/wordcount.js?x='+(Math.random());document.getElementsByTagName('head')[0].appendChild(_wordcount_script);;})();

## Sources

wordcount.it uses code from [Readability](http://code.google.com/p/arc90labs-readability/) by Arc90, and from a Gist by [Andrew Montgomery-Hurrell](https://gist.github.com/darkliquid/5244870).

## Alternatives

* http://css-tricks.com/snippets/javascript/word-count-bookmarklet/
* http://charcount.appspot.com/

## License

Distributed under the Apache License, version 2.0.
