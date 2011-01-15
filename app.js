// vim: set shiftwidth=2 softtabstop=2 tabstop=2 expandtab

if (!("console" in window)) {
	window.console = {
		'log': function () {}
	};
}

jQuery(function ($) {

function fetch(/* object */ request, /* function */ respond)
{
	console.log( request.term );

	$.get(
		'http://ws.spotify.com/search/1/artist',
		{ q: request.term },
		function (xml) {
			var data = [];
			$('artist name', xml).each(function () {
				data.push( $(this).text() )
			});

			respond( data );
		}
	);
}

  function fetch_tracks(artist) {
    console.log("Fetching tracks for " + artist);
    $.get(
      'http://ws.spotify.com/search/1/track',
      { q: 'artist:"' + artist + '"' },
      function (xml) {
        var a = $('textarea')
        $('track', xml).each(function(i) {
          if (i > 5) {
            return;
          }
          var track = $(this).attr('href')
          console.log("Adding track " + track);
          a.val(a.val() + track + "\n");
        });
      }
    );
  }

  $('.searcher').live('focus', function() {
    $(this).autocomplete({
      source: fetch,
      minLength: 2
    });
  });

  shift_is_held = false;
  $('.searcher').live('keydown',function(e) { 
    if (e.which == $.ui.keyCode.SHIFT) {
      shift_is_held = true;
    }
    if (shift_is_held && e.which == $.ui.keyCode.ENTER) {
      $('input').first().clone().val("").appendTo('form').focus();
    }
    /* Remove <input> when backspacing if:
       * The <input> is empty
       * It's not the last <input>
      and then focus the last <input>.
    */
    if (e.which == $.ui.keyCode.BACKSPACE && $(this).val() == "" && $('input').length > 1) {
      e.preventDefault();
      $(this).remove();
      $('input').last().focus();
    }
  });

  $('.searcher').live('keyup',function(e){ 
    if (e.which == $.ui.keyCode.SHIFT) {
      shift_is_held = false;
    }
  });

  $('form').submit(function() {
      $('form input').each(function() {
        var artist = $(this).val();
        console.log("Found artist: " + artist);
        fetch_tracks(artist);
      });
    return false;
  });

// test!
/*
$.get('http://ws.spotify.com/search/1/artist?q=Eld', function (response) {
	$('artist', response).each(function () {
		console.log( $('name', this).text(), $(this).attr('href') );
	})
});*/

});

