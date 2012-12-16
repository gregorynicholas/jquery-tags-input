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
 *
 * Gregory Nicholas, 2012-12-15
 */
(function($) {
  var delimiters = {};
  var callbacks = {};


  /**
   * autosizes the ghost input.
   *
   * @param  {Object} o   an options object.
   */
  $.fn.doAutosize = function(o) {
    var $ghost_input = $(this);
    if ($ghost_input.val() === '') {
      return;
    }
    var val = '';
    var minWidth = $ghost_input.data('minwidth');
    var maxWidth = $ghost_input.data('maxwidth');
    var $autosizer = $ghost_input.data('$autosizer');
    if (!$autosizer || !$autosizer.length) {
      // $ghost_input.resetAutosize();
    }
    // enter new content into $autosizer..
    var escaped = val.replace(/&/g, '&amp;')
                     .replace(/\s/g,' ')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
    $autosizer.html(escaped);
    // calculate new width & whether to change
    var autosizerW = $autosizer.width();
    var newW = minWidth;
    if (autosizerW + o.comfortZone >= minWidth) {
      newW = autosizerW + o.comfortZone;
    }
    var currentW = $ghost_input.width();
    var validWidthChange = (newW < currentW && newW >= minWidth) ||
                           (newW > minWidth && newW < maxWidth);
    if (validWidthChange) {
      $ghost_input.width(newWidth);
    }
  };


  /**
   * resets auto size.
   *
   * @param  {Object} options   an options object.
   */
  $.fn.resetAutosize = function(options) {
    var $ghost_input = $(this);
    if (!$ghost_input || !$ghost_input.length) {
      return;
    }
    var padding = parseInt($ghost_input.css('padding').replace("px", ""), 10);
    var minWidth =  $ghost_input.data('minwidth') || options.minInputWidth || $ghost_input.width();
    if ($ghost_input.data('input-holder') && $ghost_input.data('input-holder').length) {
      var maxWidth = $ghost_input.data('input-holder').width() - padding;
    }
    var maxWidth = $ghost_input.data('maxwidth') || options.maxInputWidth;
    var $autosizer = $ghost_input.data('$autosizer');
    if (!$autosizer || $autosizer.length) {
      $autosizer = $('<autosize/>');
      $autosizer.appendTo('body');
    }
    $autosizer.css({
      top: -9999,
      left: -9999,
      width: 'auto',
      position: 'absolute',
      fontSize: $ghost_input.css('fontSize'),
      fontFamily: $ghost_input.css('fontFamily'),
      fontWeight: $ghost_input.css('fontWeight'),
      letterSpacing: $ghost_input.css('letterSpacing'),
      whiteSpace: 'nowrap'
    });
    $ghost_input.data('minwidth', minWidth)
    $ghost_input.data('maxwidth', maxWidth)
    $ghost_input.data('$autosizer', $autosizer)
    $ghost_input.css('width', minWidth);
  };


  /**
   * adds a tag.
   *
   * @param {String} value
   * @param {Object} options
   */
  $.fn.addTag = function(value, options) {
    options = $.extend({
      retain_focus: false,
      fire_callbacks: true
    }, options);

    var $input = $(this);
    var id = $input.attr('id');
    var $ghost_input = $input.data('ghost_input');
    value = $.trim(value);
    if (value === '') {
      // marks fake input as invalid and returns false
      // $ghost_input.addClass('invalid');
      return false;
    }

    var $input_holder = $input.data('input-holder');
    var $existing_tags = $input_holder.find('.tag [value="'+ value +'"]');
    if ($existing_tags.length) {
      // marks fake input as invalid and returns false
      $ghost_input.addClass('invalid');
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

    // TODO: move away from parent selector here
    $new_tag.insertBefore($ghost_input.parent());

    if (options.fire_callbacks && callbacks[id] && callbacks[id]['onAddTag']) {
      var f = callbacks[id]['onAddTag'];
      f.call(this, $input, value);
    }
    if (options.fire_callbacks && callbacks[id] && callbacks[id]['onChange']) {
      var f = callbacks[id]['onChange'];
      f.call(this, $input, value);
    }

    // set at placeholder status
    $ghost_input.val('');
    $ghost_input.addClass('placeholder');

    // optionally retain focus on the fake input
    if (options.retain_focus) {
      $ghost_input.focus();
    } else {
      $ghost_input.blur();
    }
    $ghost_input.val('');

    return false;
  };


  /**
   * removes a tag.
   *
   * @param  {String} value
   */
  $.fn.removeTag = function(value) {
    value = unescape(value);
    var $input = $(this);
    var id = $input.attr('id');
    // remove any tag that has [data-value] attribute matches
    // the value arg..
    var $input_holder = $input.data('input-holder');
    // remove visual tag elements..
    var $tags = $input_holder.find('.tag[data-value="'+ value +'"]');
    $tags.remove();
    // fire callbacks..
    if (callbacks[id] && callbacks[id]['onRemoveTag']) {
      var f = callbacks[id]['onRemoveTag'];
      f.call(this, value);
    }
    return false;
  };


  /**
   * clear all existing tags and import new ones from an array of strings.
   *
   * @param  {Array} values   Array of strings.
   */
  $.fn.importTags = function(values) {
    var $this = $(this);
    var id = $input.attr('id');
    // remove existing tag elements..
    var $input_holder = $this.data('input-holder');
    $input_holder.find('.tag').remove();
    $.fn.tagsInput.importFromList({
      id: id,
      values: values,
      $input_holder: $this
    });
  };


  /**
   * [tagsInput description]
   *
   * @param  {Object} options   An options object.
   *
   * @return {jQuery}   A reference back to this.
   */
  $.fn.tagsInput = function(options) {
    var config = $.extend({
      hide: true,
      width: '300px',
      height: '100px',
      unique: true,
      autosize: true,
      minChars: 0,
      delimiter: ',',
      interactive: true,
      autocomplete: {
        source: null,
        enabled: false,
        selectFirst: false
      },
      placeholderText: 'add a tag',
      removeOnBackspace: true,
      comfortZone: 20
    }, options);

    $(this).each(function() {
      var $input = $(this);
      if (config.hide) {
        $input.hide();
      }
      var id = $input.attr('id');

      var $ghost_input_container = $('<div id="'+ id +'_addTag" class="tags-input-a"></div>');
      var $ghost_input = $('<input id="'+ id +'_tag" value="" data-placeholder-text="'+ config.placeholderText +'" />');
      $ghost_input_container.append($ghost_input)

      var $holder = $('<div id="'+ id +'_tags-input" class="tags-input-field"></div>');
      $holder.append($ghost_input_container);
      $holder.append('<div class="tags-clear"></div>');
      $holder.insertAfter(this);

      $input.data('pid', id);
      $input.data('input-holder', $holder);
      $input.data('ghost_input', $ghost_input);

      var _config = $.extend({
        pid: id,
        $holder: $holder,
        $real_input: $input,
        $ghost_input: $ghost_input
      }, config);

      delimiters[id] = _config.delimiter;

      if (_config.onAddTag || _config.onRemoveTag || _config.onChange) {
        callbacks[id] = [];
        callbacks[id]['onAddTag'] = _config.onAddTag;
        callbacks[id]['onRemoveTag'] = _config.onRemoveTag;
        callbacks[id]['onChange'] = _config.onChange;
      }

      _config.$holder.css({
        width: _config.width,
        height: _config.height
      });

      // set at placeholder status
      // set ghost input with placeholder default
      _config.$ghost_input.val(_config.placeholderText);
      _config.$ghost_input.addClass('placeholder');
      _config.$ghost_input.resetAutosize(config);
      _config.$holder.bind('click', function(event) {
        _config.$ghost_input.focus();
      });
      _config.$ghost_input.bind('focus', function(event) {
        if (_config.$ghost_input.val() === _config.placeholderText) {
          _config.$ghost_input.val('');
        }
        // TODO: change away from parent()
        _config.$holder.parent().addClass('focused');
      });

      // Autocomplete
      if (config.autocomplete.enabled) {
        if (jQuery.Autocompleter !== undefined) {
          _config.$ghost_input.autocomplete(
            _config.autocomplete.url,
            _config.autocomplete);
          _config.$ghost_input.bind('result', _config,
            function(event, _data, formatted) {
            if (_data) {
              $input.addTag(
                _data[0] + '', true, {
                  retain_focus: true,
                  unique: (config.unique)
              });
            }
          });
        } else if (jquery.ui && jQuery.ui.autocomplete !== undefined) {
          _config.$ghost_input.autocomplete(_config.autocomplete);
          _config.$ghost_input.bind('autocompleteselect', _config,
            function(event, ui) {
            $input.addTag(ui.item.value, true, {
              retain_focus: true,
              unique: (config.unique)
            });
            return false;
          });
        }
      } else {
        // if a user tabs out of the field, create a new tag
        // this is only available if autocomplete is not used.
        _config.$ghost_input.bind('blur', _config, function(event) {
          var new_value = _config.$ghost_input.val();

          // set at placeholder status
          if (new_value === '' || new_value === _config.placeholderText) {
            _config.$ghost_input.addClass('placeholder');
            _config.$ghost_input.val(_config.placeholderText);
            return false;
          } else {
            _config.$ghost_input.removeClass('placeholder');
          }

          // validate char length
          if (_config.minChars && new_value.length < _config.minChars) {
            return false;
          }
          if (_config.maxChars && new_value.length > _config.maxChars) {
            return false;
          }

          _config.$real_input.addTag(new_value, true, {
            retain_focus: true,
            unique: (_config.unique)
          });

          _config.$holder.parents('.focused').removeClass('focused');
        });
      }

      // if user types a comma, create a new tag
      _config.$ghost_input.bind('keypress', _config, function(e) {
        if (e.which !== _config.delimiter.charCodeAt(0) &&
            e.which !== 13) {
          if (_config.autosize) {
            _config.$ghost_input.doAutosize(_config);
          }
          return true;
        }
        // handle <return>
        e.preventDefault();
        var new_value = _config.$ghost_input.val();
        if (_config.minChars && new_value.length < _config.minChars) {
          return false;
        }
        if (_config.maxChars && new_value.length > _config.maxChars) {
          return false;
        }
        _config.$real_input.addTag(new_value, true, {
          retain_focus: true,
          unique: (config.unique)
        });
        _config.$ghost_input.resetAutosize(config);
        return false;
      });

      // Delete last tag on backspace
      if (_config.removeOnBackspace) {
        _config.$ghost_input.bind('keydown', function(e) {
          e.preventDefault();
          if (e.keyCode === 8 && _config.$ghost_input.val() === '') {
            $input.removeLastTag(_config);
          }
        });
      }
      _config.$ghost_input.blur();

      // Removes the invalid class when user changes the value
      // of the fake input
      if (_config.unique) {
        _config.$ghost_input.keydown(function(e){
          if (e.keyCode === 8 ||
              String.fromCharCode(e.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
            _config.$ghost_input.removeClass('invalid');
          }
        });
      }
      return false;
    });

    return this;
  };


  /**
   * removes the last position tag value.
   *
   * @param  {Object} options   An options object.
   */
  $.fn.tagsInput.removeLastTag = function(options) {
    options.$real_input.removeTag(escape(
      options.$holder
        .find('.tag:last')
        .text()
        .replace(/[\s]+x$/, ''))
    );
    // refocus the ghost input
    options.$ghost_input.trigger('focus');
  };


  $.fn.tagsInput.initAutocomplete = function(options) {

  };


  /**
   * import tags.
   *
   * @param  {Object} options   An options object.
   */
  $.fn.tagsInput.importFromList = function(options) {
    // options = {$input_holder, id, values}
    for (i = 0, total = options.values.length; i < total; i++) {
      options.$input_holder.addTag(options.values[i], {
        retain_focus: false,
        fire_callbacks: false
      });
    }
    var id = $(this).attr('id');
    if (callbacks[id] && callbacks[id]['onChange']) {
      var f = callbacks[id]['onChange'];
      f.call(this, options.$input_holder, values);
    }
  };

})(jQuery);