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

$('#searcher').autocomplete({
	source: fetch,
	minLength: 2
});


// test!
/*
$.get('http://ws.spotify.com/search/1/artist?q=Eld', function (response) {
	$('artist', response).each(function () {
		console.log( $('name', this).text(), $(this).attr('href') );
	})
});*/

});

