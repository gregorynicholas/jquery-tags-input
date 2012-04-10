/*
 * jQuery Tags Input Plugin (1.3.3 ver #'s are pretty useless in the age of nightly builds)
 * http://xoxco.com/clickable/jquery-tags-input
 *
 * Gregory Nicholas, 2012-04-10
 *
 * Refactored to not be so clumsy with selectors!
 * Many of selectors are not running dozens and dozens of
 * times per function invocation anymore, instead, taking
 * advantage of the closure & local var scope to reuse the
 * same jQuery objects.
 *
 * Also changed the input to not do awkward string
 * concatenation, & instead manage actual multi-input
 * form fields. This makes consumption of the form data on
 * the server side much more consistent, and speed on the
 * client side much faster as well.
 */

(function($) {
  var delimiter = [];
  var tags_callbacks = [];


  $.fn.doAutosize = function(o) {
    var $ghost_input = $(this); // ghost_input
    if ($ghost_input.val() === '') {
      return;
    }
    var val = '';
    var minWidth = $ghost_input.data('minwidth');
    var maxWidth = $ghost_input.data('maxwidth');
    var $autosizer = $ghost_input.data('autosizer');

    if (!$autosizer || !$autosizer.length) {
      //$ghost_input.resetAutosize();
    }

    // Enter new content into $autosizer
    var escaped = val.replace(/&/g, '&amp;')
                     .replace(/\s/g,' ')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
    $autosizer.html(escaped);

    // Calculate new width + whether to change
    var autosizerWidth = $autosizer.width();
    var newWidth = (autosizerWidth+o.comfortZone) >= minWidth ? autosizerWidth + o.comfortZone : minWidth;
    var currentWidth = $ghost_input.width();
    var isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth) ||
                             (newWidth > minWidth     && newWidth < maxWidth);

    // Animate width
    if (isValidWidthChange) {
      $ghost_input.width(newWidth);
    }
  };


  $.fn.resetAutosize = function(options) {
    var $ghost_input = $(this);
    if (!$ghost_input || !$ghost_input.length) {
      return;
    }
    var minWidth =  $ghost_input.data('minwidth') || options.minInputWidth || $ghost_input.width();
    if ($ghost_input.data('input_holder') && $ghost_input.data('input_holder').length) {
      var maxWidth = $ghost_input.data('input_holder').width() - options.inputPadding;
    }
    var maxWidth = $ghost_input.data('maxwidth') || options.maxInputWidth;
    var val = '';

    var $autosizer = $ghost_input.data('autosizer');
    if (!$autosizer || $autosizer.length) {
      $autosizer = $('<autosize/>');
      $autosizer.appendTo('body');
    }

    $autosizer.css({
      position: 'absolute',
      top: -9999,
      left: -9999,
      width: 'auto',
      fontSize: $ghost_input.css('fontSize'),
      fontFamily: $ghost_input.css('fontFamily'),
      fontWeight: $ghost_input.css('fontWeight'),
      letterSpacing: $ghost_input.css('letterSpacing'),
      whiteSpace: 'nowrap'
    });
    $ghost_input.data('autosizer', $autosizer)
    $ghost_input.data('minwidth', minWidth)
    $ghost_input.data('maxwidth', maxWidth)
    $ghost_input.css('width', minWidth);
  };



  $.fn.addTag = function(value, options) {
    options = $.extend({ focus:false, callback:true }, options);

    var $input = $(this);
    var id = $input.attr('id');
    var $ghost_input = $input.data('ghost_input');
    value = $.trim(value);
    if (value === '') {
      // marks fake input as not_valid and returns false
      // $ghost_input.addClass('not_valid');
      return false;
    }

    var $input_holder = $input.data('input_holder');
    var $existing_tags = $input_holder.find('.tag [value="'+ value +'"]');
    if ($existing_tags.length) {
      // marks fake input as not_valid and returns false
      $ghost_input.addClass('not_valid');
      return false;
    }

    var $new_tag = $('<span data-value="'+ value +'" class="tag">'+
      '<span>'+ value +'</span>'+
      '<input type="hidden" name="'+ $input.attr('data-field') +'" value="'+ value +'" />'+
      '<span data-action="remove-tag"></span>'+
      '</span>');

    $new_tag.bind('click', function(e) {
      e.preventDefault();
      $input.removeTag(value);
    });

    // TODO: need a better selector here
    $new_tag.insertBefore($ghost_input.parent());

    if (options.callback && tags_callbacks[id] && tags_callbacks[id]['onAddTag']) {
      var f = tags_callbacks[id]['onAddTag'];
      f.call(this, value);
    }
    if (options.callback && tags_callbacks[id] && tags_callbacks[id]['onChange']) {
      var total = tagslist.length;
      var f = tags_callbacks[id]['onChange'];
      f.call(this, $input, tagslist);
    }

    // set at placeholder status
    $ghost_input.val('');

    // optionally retain focus on the fake input
    if (options.focus) {
      $ghost_input.focus();
    } else {
      $ghost_input.blur();
    }
    $ghost_input.val('');

    return false;
  };



  $.fn.removeTag = function(value) {
    value = unescape(value);
    var $input = $(this);
    var id = $input.attr('id');
    // remove any tag that has [data-value] attribute matches
    // the value arg
    var $input_holder = $input.data('input_holder');

    // remove visual tag elements
    var $tags = $input_holder.find('.tag[data-value="'+ value +'"]');
    $tags.remove();

    if (tags_callbacks[id] && tags_callbacks[id]['onRemoveTag']) {
      var f = tags_callbacks[id]['onRemoveTag'];
      f.call(this, value);
    }
    return false;
  };


  // clear all existing tags and import new ones from a string (list,
  // fuck the original author)
  $.fn.importTags = function(tags_list) {
    var $input = $(this);
    var id = $input.attr('id');

    // remove current tag elements
    // TODO: change this re-querying to be a cached property
    var $input_holder = $input.data('input_holder');

    // remove existing tags
    $input_holder.find('.tag').remove();

    var options = {
      $input_holder: $input,
      id: id,
      tags_list: tags_list
    }
    $.fn.tagsInput.importFromList(options);
  };


  $.fn.tagsInput = function(options) {
    var settings = $.extend({
      interactive: true,
      defaultText: 'add a tag',
      minChars: 0,
      width: '300px',
      height: '100px',
      autocomplete: {
        selectFirst: false
      },
      'hide': true,
      'delimiter': ',',
      'unique': true,
      removeWithBackspace: true,
      placeholderColor: '#666666',
      autosize: true,
      comfortZone: 20,
      inputPadding: 6*2
    }, options);


    $(this).each(function() {
      var $input = $(this);
      if (settings.hide) {
        $input.hide();
      }
      var id = $input.attr('id');

      var $ghost_input_container = $('<div id="'+ id +'_addTag" class="tagsinput-a"></div>');
      var $ghost_input = $('<input id="'+ id +'_tag" value="" placeholder="'+ settings.defaultText +'" data-default="'+ settings.defaultText +'" />');
      $ghost_input_container.append($ghost_input)

      var $holder = $('<div id="'+ id +'_tagsinput" class="tagsinput"></div>');
      $holder.append($ghost_input_container);
      $holder.append('<div class="tags_clear"></div>');
      $holder.insertAfter(this);

      $input.data('pid', id);
      $input.data('input_holder', $holder);
      $input.data('ghost_input', $ghost_input);

      var data = $.extend({
        pid: id,
        $real_input: $input,
        $holder: $holder,
        $ghost_input: $ghost_input
      }, settings);

      delimiter[id] = data.delimiter;

      if (settings.onAddTag || settings.onRemoveTag || settings.onChange) {
        tags_callbacks[id] = [];
        tags_callbacks[id]['onAddTag'] = settings.onAddTag;
        tags_callbacks[id]['onRemoveTag'] = settings.onRemoveTag;
        tags_callbacks[id]['onChange'] = settings.onChange;
      }

      data.$holder.css({
        width: settings.width,
        height: settings.height
      });

      // early return for validation
      if (data.$real_input.val() !== '') {
        //$.fn.tagsInput.importTags(data.$real_input, data.$real_input.val());
      }

      // set ghost input with placeholder default
      data.$ghost_input.val(settings.defaultText);




      // set at placeholder status
      //$(data.fake_input).css('color', settings.placeholderColor);



      data.$ghost_input.resetAutosize(settings);
      data.$holder.bind('click', function(event) {
        data.$ghost_input.focus();
      });
      data.$ghost_input.bind('focus', function(event) {
        if (data.$ghost_input.val() === data.$ghost_input.attr('data-default')) {
          data.$ghost_input.val('');
        }
        data.$holder.parent().addClass('focused'); // TODO: change from parent()
      });


      // Autocomplete
      if (settings.autocomplete_url !== undefined) {
        autocomplete_options = {
          source: settings.autocomplete_url
        };
        for (attrname in settings.autocomplete) {
          autocomplete_options[attrname] = settings.autocomplete[attrname];
        }

        if (jQuery.Autocompleter !== undefined) {
          data.$ghost_input.autocomplete(settings.autocomplete_url, settings.autocomplete);
          data.$ghost_input.bind('result', data, function(event, data, formatted) {
            if (data) {
              $input.addTag(
                data[0] + '', true, {
                  focus: true,
                  unique: (settings.unique)
              });
            }
          });
        } else if (jQuery.ui.autocomplete !== undefined) {
          data.$ghost_input.autocomplete(autocomplete_options);
          data.$ghost_input.bind('autocompleteselect', data, function(event, ui) {
            $input.addTag(
              ui.item.value, true, {
                focus: true,
                unique: (settings.unique)
            });
            return false;
          });
        }


      } else {
        // if a user tabs out of the field, create a new tag
        // this is only available if autocomplete is not used.
        data.$ghost_input.bind('blur', data, function(event) {
          var new_value = data.$ghost_input.val();

          // set at placeholder status
          if (new_value === '' || new_value === data.defaultText) {
            // data.$ghost_input.css('color',settings.placeholderColor);
            data.$ghost_input.val(data.defaultText);
            return false;
          }

          // validate char length
          if (data.minChars && new_value.length < data.minChars) {
            return false;
          }
          if (data.maxChars && new_value.length > data.maxChars) {
            return false;
          }

          data.$real_input.addTag(
            new_value, true, {
              focus:true,
              unique:(settings.unique)
          });

          data.$holder.parents('focused').removeClass('focused');
        });
      }

      // if user types a comma, create a new tag
      data.$ghost_input.bind('keypress', data, function(event) {
        if (event.which !== data.delimiter.charCodeAt(0) && event.which !== 13) {
          if (data.autosize) {
            data.$ghost_input.doAutosize(settings);
          }
          return true;
        }
        // handler <enter> key
        event.preventDefault();
        var new_value = data.$ghost_input.val();

        // validate char length
        if (data.minChars && new_value.length < data.minChars) {
          return false;
        }
        if (data.maxChars && new_value.length > data.maxChars) {
          return false;
        }

        data.$real_input.addTag(
          new_value, true, {
            focus: true,
            unique: (settings.unique)
          })

        data.$ghost_input.resetAutosize(settings);
        return false;
      });

      // Delete last tag on backspace
      data.removeWithBackspace && data.$ghost_input.bind('keydown', function(event) {
        if (event.keyCode === 8 && data.$ghost_input.val() === '') {
          event.preventDefault();
          var $last_tag = data.$ghost_input.closest('.tagsinput').find('.tag:last').text();
          var last_tag_value = $last_tag.replace(/[\s]+x$/, '');
          data.$real_input.removeTag(escape(last_tag_value));
          data.$ghost_input.trigger('focus');
        }
      });
      data.$ghost_input.blur();

      // Removes the not_valid class when user changes the value
      // of the fake input
      if (data.unique) {
        data.$ghost_input.keydown(function(event){
          if (event.keyCode === 8 || String.fromCharCode(event.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
            data.$ghost_input.removeClass('not_valid');
          }
        });
      }
      return false;
    });

    return this;
  };


  $.fn.tagsInput.importFromList = function(options) {
    // options = {$input_holder, id, tags_list}
    for (i=0, total=options.tags_list.length; i<total; i++) {
      options.$input_holder.addTag(options.tags_list[i], {
        focus: false,
        callback: false
      });
    }
    var id = $(this).attr('id');
    if (tags_callbacks[id] && tags_callbacks[id]['onChange']) {
      var f = tags_callbacks[id]['onChange'];
      f.call(
        this, options.$input_holder, tags_list);
    }
  };


})(jQuery);