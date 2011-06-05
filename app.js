// vim: shiftwidth=2 softtabstop=2 tabstop=2 expandtab

if (!("console" in window)) {
  window.console = {
    'log': function () {}
  };
}

jQuery(function ($) {

  function fetch(/* object */ request, /* function */ respond) {
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

  function add_to_textarea(tracks) {
    var a = $('textarea');

    a.val(tracks.join('\n'));

    // Resize textarea
    a.attr('rows', function (i, oldval) {
      if (tracks.length < 50) {
        return tracks.length > oldval ? tracks.length : oldval;
      }
    });
  }

  function fetch_tracks(artist, number_of_tracks, when_completed) {
    console.log("Fetching tracks for " + artist);

    $.get(
      'http://ws.spotify.com/search/1/track',
      { q: 'artist:"' + artist + '"' },
      function (xml) {
        var tracks = []
        var user_country = geoip_country_code();
        var tracks_added = 0;
        $('track', xml).each(function(i) {
          if (tracks_added >= number_of_tracks) {
            return;
          }
          var track = $(this).attr('href')
          track_territory = $(this).find('territories:contains(' + user_country + ')').first();
          // Only add track if it's available "worldwide" or in the users country
          if ($(this).find('territories').first().text() == "worldwide" || track_territory.length) {
            console.log("Adding track " + track);
            tracks.push(track);
            tracks_added++;
          }
          else {
            console.log("Not adding " + track + " since it's not available in user territory (" + user_country + ").");
          }
        });
        when_completed(tracks);
      }
    );
  }

  $('.searcher').live('focus', function() {
    $(this).autocomplete({
      source: fetch,
      minLength: 2
    });
  });

  $('.searcher').live('keydown',function(e) { 
    // Only create new input if old input is empty
    if (e.shiftKey && e.which == $.ui.keyCode.ENTER && $(this).val() != '') {
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

  $('form').submit(function() {
      var number_of_tracks = parseInt($('#number_of_tracks').val(), 10);
      if (isNaN(number_of_tracks)) {
        number_of_tracks = 5;
      }
      $('form input').each(function() {
        var artist = $(this).val();
        if (artist) {
          console.log("Found artist: " + artist);
          fetch_tracks(artist, number_of_tracks, add_to_textarea);
        }
      });
    return false;
  });


  $('.searcher').first().focus();
});

