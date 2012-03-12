// vim: shiftwidth=2 softtabstop=2 tabstop=2 expandtab

if (!("console" in window)) {
  window.console = {
    'log': function () {}
  };
}

jQuery(function ($) {

  function fetch(/* object */ request, /* function */ respond) {
    if ($('input[name=search_type]:checked').attr("id") != "artist") {
      return;
    }

    console.log("Auto-completing: " + request.term );

    $.get(
      'http://ws.spotify.com/search/1/artist',
      { q: request.term + '*' },
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
    var value = jQuery.trim(a.val() + "\n" + tracks.join('\n'));

    a.val(value);
    $('#tracks_shadow').text(value);

    // Resize textarea
    // FIXME Ugh, horrid hack
    var textarea_rows = a.val().split('\n').length;
    // TODO Make the expansion smoother and limit it
    a.attr('rows', function (i, oldval) {
      if (textarea_rows < 50) {
        return textarea_rows > oldval || oldval + 10 > textarea_rows ? textarea_rows : oldval;
      }
    });
  }

  function fetch_tracks(artist, number_of_tracks, when_completed, page) {
    console.log("Fetching tracks for " + artist);
    var page = page || 1;

    $.get(
      'http://ws.spotify.com/search/1/track',
      { q: 'artist:"' + artist + '"', page: page },
      function (xml) {
        var tracks = []
        var user_country = geoip_country_code();
        var tracks_added = 0;
        $('track', xml).each(function(i) {
          if (tracks_added >= number_of_tracks) {
            console.log("Done adding tracks, we've reached " + tracks_added);
            return false;
          }
          if (page > 5) {
            console.log("We are on page " + page + ", won't search any further for artist " + artist + ".");
            return false;
          }
          if (i == 99 && tracks_added < number_of_tracks) {
            page = page + 1;
            console.log("Didn't find enough tracks (only found " + tracks_added
              + " out of " + number_of_tracks + "), so fetching from page " +
              page + ".");
            fetch_tracks(artist, number_of_tracks, when_completed, page);
            return false;
          }
          var track_id = $(this).attr('href')
          track_territory = $(this).find('territories:contains(' + user_country + ')').first();
          var track_name = $('> name', this).text();
          var artist_name = $('artist name', this).map(function(){
            return $(this).text();
            }).get().join(', ');
          var album_name = $('album name', this).text();
          var track_info = artist_name + "-" + track_name + " (" + album_name + ") " + track_id;
          // Only add track if it's available "worldwide" or in the users country
          if ($(this).find('territories').first().text() == "worldwide" || track_territory.length) {
            console.log("Adding " + track_info);
            tracks.push(track_id);
            tracks_added++;
          }
          else {
            console.log("Not adding " + track_info + " since it's not available in user territory (" + user_country + ").");
          }
        });
        when_completed(tracks);
      }
    );
  }

  function set_submit_action() {
    $('form').unbind('submit');
    switch ($(this).attr("id")) {
      case "artist": 
        $('form').submit(fetch_tracks_of_artists);
        break;
      case "event":
        $('form').submit(fetch_tracks_from_event);
        break;
      default:
        alert("fubar");
    }
  }

  function fetch_tracks_of_artists() {
    if (document.activeElement) {
      $(document.activeElement).autocomplete("close");
    }

    var artists = [];
    $('form input[type=search]').each(function() {
        artists.push($(this).val());
    });

    fetch_tracks_from_artists(artists);

    return false;
  }

  function fetch_tracks_from_artists(artists) {
    $('textarea').val("");

    var number_of_tracks = parseInt($('#number_of_tracks').val(), 10);
    if (isNaN(number_of_tracks)) {
      number_of_tracks = 5;
    }

    jQuery.each(artists, function(k,artist) {
      console.log("Found artist: " + artist);
      fetch_tracks(artist, number_of_tracks, add_to_textarea);
    });
  }

  function fetch_artists_from_event(data, status) {
    var artists = [];
    $(data).find("artist").each(function() {
        artists.push($(this).text());
    });

    fetch_tracks_from_artists(artists);
  }

  function fetch_tracks_from_event() {
    $('form input[type=search]').each(function() {
      var event_url = $(this).val();
      var event_id = null
      if (event_url.match(/\/(?:festival|event)\/(\d+?)\+/)) {
        console.log("Found event: " + event_url);
        event_id = RegExp.$1;
      }
      else {
        console.log("Couldn't find the event ID in your URL. The URLs should look like this:\nhttp://www.last.fm/festival/1834310+Dans+Dakar\nor this:\nhttp://www.last.fm/event/1821078+DJ+Shadow");
        return;
      }

      $.get(
        'fetch_event.lua',
        { event: event_id },
        fetch_artists_from_event
      );
    });
    return false;
  }

  $('.searcher').live('focus', function() {
    $(this).autocomplete({
      source: fetch,
      minLength: 2
    });
  });

  // Set submit action when radio button is pressed
  $('input[name=search_type]').click(set_submit_action);
  // Set submit action when site is loaded
  $('input[name=search_type]:checked').each(set_submit_action);

  $('.searcher').live('paste',function() {
    var e = $(this);
    setTimeout(function() {
      var pasted = $(e).val();
      if (! /,/.test(pasted)) {
        console.log("Something was pasted, but there was no comma.");
        return;
      }
      var artists = [];

      artists = pasted.split(/ ?, ?/).reverse();

      // Replace where we pasted with the first artist
      // FIXME: This makes autocomplete trigger. Stop it!
      $(e).val(artists.pop());

      var last = e;
      jQuery.each(artists.reverse(), function(k, artist) {
        last = insert_new_search_input_last(artist, last);
      });
    },
    // http://stackoverflow.com/questions/686995/jquery-catch-paste-input/3553217#3553217
    0);
  });

  function insert_new_search_input_last(value, element) {
    return $('input[type=search]').first().clone().val(value).insertAfter(element).focus();
  }

  $('.searcher').live('keydown',function(e) { 
    var comma_is_last = /,$/;
    if (e.which == $.ui.keyCode.SPACE && comma_is_last.test($(this).val())) {
      $(this).val($(this).val().replace(comma_is_last, ""));
      insert_new_search_input_last("", $(this));
      $(this).autocomplete("close");
      // We don't want the space to be inserted
      e.preventDefault();
    }

    // Only create new input if old input is empty
    if (e.shiftKey && e.which == $.ui.keyCode.ENTER && $(this).val() != '') {
      insert_new_search_input_last("", $(this));
      $(this).autocomplete("close");
      // Needed or else we will submit
      return false;
    }
    /* Remove <input> when backspacing if:
       * The <input> is empty
       * It's not the last <input>
      and then focus the last <input>.
    */
    if (e.which == $.ui.keyCode.BACKSPACE && $(this).val() == "" && $('input[type=search]').length > 1) {
      e.preventDefault();
      $(this).remove();
      $('input[type=search]').last().focus();
    }
  });

  // Disable/enable when blur/focus of input
  $('.searcher').live('blur', function(e) {
      $(this).autocomplete('disable');
  });

  $('.searcher').live('focus', function(e) {
      $(this).autocomplete('enable');
  });

  // http://stackoverflow.com/questions/5797539/jquery-select-all-text-from-a-textarea
  $('textarea').focus(function() {
    $(this).select();
        // Work around Chrome's little problem
    $(this).mouseup(function() {
        // Prevent further mouseup intervention
        $(this).unbind("mouseup");
        return false;
    });
  });

  $("#slider").slider({
    value: 5,
    min: 1,
    max: 100,
    slide: function(event, ui) {
      $("#number_of_tracks").val(ui.value);
    }
  });
  $("#number_of_tracks").val($("#slider").slider("value"));

  $('.searcher').first().focus();
});

