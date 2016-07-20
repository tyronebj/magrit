"use strict";

function handle_legend(layer){
    let state = current_layers[layer].renderer;
    if(state != undefined){
        let class_name = [".lgdf", layer].join('_');
        let rml = false;
        if(d3.select(class_name).node()){
            if(!d3.select(class_name).attr("display"))
                d3.select(class_name).attr("display", "none");
            else
                d3.select(class_name).attr("display", null);
//            d3.selectAll(class_name).remove();
//            d3.selectAll(".source_block").remove();
            rml = true;
        } else {
            createLegend(layer, "")
        }
    }
}

function createLegend(layer, title){
    // Common part :
//    var source_info = map.insert('g').attr("class", "legend_feature source_block")
//                        .insert("text").style("font", "italic 10px Gill Sans Extrabold, sans-serif")
//                        .attr({id: "source_block", x: 10, y: h-10})
//                        .text("Rendered by MAPOLOGIC");

    var field = current_layers[layer].rendered_field;
    // Specific parts :
    if(current_layers[layer].renderer.indexOf("PropSymbolsChoro") != -1){
        let field2 = current_layers[layer].rendered_field2;
        createLegend_choro(layer, field2, title);
        createLegend_symbol(layer, field);
    }
    else if(current_layers[layer].renderer.indexOf("PropSymbols") != -1
            || current_layers[layer].renderer.indexOf("DorlingCarto") != -1)
        createLegend_symbol(layer, field, title);

    else if (current_layers[layer].renderer.indexOf("Links") != -1
            || current_layers[layer].renderer.indexOf("DiscLayer") != -1)
        createLegend_discont_links(layer, field);

    else if (current_layers[layer].colors_breaks || current_layers[layer].color_map || current_layers[layer].symbols_map)
        createLegend_choro(layer, field, title, field);

    else if (current_layers[layer].renderer.indexOf("Carto_doug") != -1)
        createLegend_nothing(layer, field, "Dougenik Cartogram", field);

    else
        createLegend_nothing(layer, field, title, field);
}

function make_legend_context_menu(legend_node, layer){
   let context_menu = new ContextMenu(),
       getItems = () =>  [
        {"name": "Edit style...", "action": () => {  createlegendEditBox(legend_node.attr("id"), layer);  }},
        {"name": "Hide", "action": () => {
            if(!legend_node.attr("display"))
                legend_node.attr("display", "none");
            else
                legend_node.attr("diplay", null);
        }}
    ];
    legend_node.on("dblclick", () => {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        createlegendEditBox(legend_node.attr("id"), layer);
        });

    legend_node.on("contextmenu", () => {
        context_menu.showMenu(d3.event,
                              document.querySelector("body"),
                              getItems());
        });
}

var drag_legend_func = function(legend_group){
    return d3.behavior.drag()
            .origin(function() {
                let t = d3.select(this);
                return {x: t.attr("x") + d3.transform(t.attr("transform")).translate[0],
                        y: t.attr("y") + d3.transform(t.attr("transform")).translate[1]};
            })
            .on("dragstart", () => {
                d3.event.sourceEvent.stopPropagation();
                d3.event.sourceEvent.preventDefault();
                if(d3.select("#hand_button").classed("active")) zoom.on("zoom", null);
                })
            .on("dragend", () => {
                if(d3.select("#hand_button").classed("active")) zoom.on("zoom", zoom_without_redraw);
                legend_group.style("cursor", "grab");
                })
            .on("drag", function() {
                legend_group.attr('transform', 'translate(' + [d3.event.x, d3.event.y] + ')')
                        .style("cursor", "grabbing");
                });
}

function createLegend_nothing(layer, field, title, subtitle){
    var subtitle = subtitle || field,
        space_elem = 18,
        boxgap = 12,
        xpos = 30,
        ypos = 30,
        tmp_class_name = ["legend_feature", "lgdf_" + layer].join(' '),
        legend_root = map.insert('g').attr('id', 'legend_root_nothing').attr("class", tmp_class_name).style("cursor", "grab");

    legend_root.insert('text').attr("id","legendtitle")
            .text(title || "Title").style("font", "bold 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + space_elem * 2 + boxgap)
            .attr("y", ypos)

    legend_root.insert('text').attr("id","legendsubtitle")
            .text(subtitle).style("font", "italic 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + space_elem * 2 + boxgap)
            .attr("y", ypos + 15);

    legend_root.call(drag_legend_func(legend_root));

    legend_root.append("g").attr("class", "legend_feature")
            .insert("text").attr("id", "legend_bottom_note")
            .attr({x: xpos, y: ypos + 2*space_elem})
            .style("font", "11px 'Enriqueta', arial, serif")
            .html('Additional notes');
    make_underlying_rect(legend_root, rect_under_legend, xpos, ypos);
    legend_root.select('#legendtitle').text(title || "");
    make_legend_context_menu(legend_root, layer);
}

function createLegend_discont_links(layer, field, title, subtitle){
    var subtitle = subtitle || field,
        space_elem = 18,
        boxgap = 12,
        xpos = 30,
        ypos = 30,
        y_pos2 =  ypos + space_elem,
        tmp_class_name = ["legend_feature", "lgdf_" + layer].join(' '),
        legend_root = map.insert('g').attr('id', 'legend_root_links').attr("class", tmp_class_name).style("cursor", "grab"),
        breaks = current_layers[layer].breaks,
        nb_class = breaks.length;

    var rect_under_legend = legend_root.insert("rect");

    legend_root.insert('text').attr("id","legendtitle")
            .text(title || "Title").style("font", "bold 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + space_elem * 2 + boxgap)
            .attr("y", ypos)

    legend_root.insert('text').attr("id","legendsubtitle")
            .text(subtitle).style("font", "italic 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + space_elem * 2 + boxgap)
            .attr("y", ypos + 15);

    let ref_symbols_params = new Array();

    for(let b_val of breaks)
        ref_symbols_params.push({value:b_val[0], size:b_val[1]})

    var legend_elems = legend_root.selectAll('.legend')
                                  .append("g")
                                  .data(ref_symbols_params)
                                  .enter().insert('g')
                                  .attr('class', function(d, i) { return "legend_feature lg legend_" + i; });

    let max_size = current_layers[layer].size[1],
        last_size = 0,
        last_pos = y_pos2,
        color = current_layers[layer].fill_color.single;

    legend_elems
          .append("rect")
          .attr("x", function(d, i){ return xpos + space_elem + max_size / 2;})
          .attr("y", function(d, i){
                    last_pos = boxgap + last_pos + last_size;
                    last_size = d.size;
                    return last_pos;
                    })
          .attr('width', 45)
          .attr('height', function(d, i){  return d.size;  })
          .style({fill: color, stroke: "rgb(0, 0, 0)", "fill-opacity": 0.7})

    last_pos = y_pos2;
    last_size = 0;

    let x_text_pos = xpos + space_elem + max_size * 1.5 + 45;
    legend_elems.append("text")
        .attr("x", x_text_pos)
        .attr("y", function(d, i){
                    last_pos = boxgap + last_pos + last_size;
                    last_size = d.size;
                    return last_pos + (d.size * 2 / 3);
                    })
        .style({'alignment-baseline': 'middle' , 'font-size':'10px'})
        .text(function(d, i){return d.value;});

    legend_root.call(drag_legend_func(legend_root));

    legend_root.append("g").attr("class", "legend_feature")
            .insert("text").attr("id", "legend_bottom_note")
            .attr({x: xpos, y: last_pos + 2*space_elem})
            .style("font", "11px 'Enriqueta', arial, serif")
            .html('Additional notes');
    make_underlying_rect(legend_root, rect_under_legend, xpos, ypos);
    legend_root.select('#legendtitle').text(title || "");
    make_legend_context_menu(legend_root, layer);
}

function make_underlying_rect(legend_root, under_rect, xpos, ypos){
    let bbox_legend = legend_root.node().getBoundingClientRect();
    under_rect.attr("class", "legend_feature").attr("id", "under_rect")
                     .attr("height", Math.round(bbox_legend.height / 5) * 5 + 10)
                     .attr("width", Math.round(bbox_legend.width / 5) * 5 + 10)
                     .style("fill", "green")
                     .style("fill-opacity", 0);
    if(xpos && ypos)
        under_rect.attr("x", xpos - 5).attr("y", ypos - 5)
    legend_root.on("mouseover", ()=>{ under_rect.style("fill-opacity", 0.1); })
    legend_root.on("mouseout", ()=>{ under_rect.style("fill-opacity", 0); });
}

function createLegend_symbol(layer, field, title, subtitle, nested = "false"){
    var subtitle = subtitle || field,
        space_elem = 18,
        boxgap = 4,
        xpos = 30,
        ypos = 30,
        y_pos2 =  ypos + space_elem,
        ref_layer_name = layer.indexOf('_PropSymbols') > -1 ? layer.split("_PropSymbols")[0] : current_layers[layer].ref_layer_name,
        nb_features = user_data[ref_layer_name].length,
        tmp_class_name = ["legend_feature", "lgdf_" + layer].join(' '),
        symbol_type = current_layers[layer].symbol;


    var legend_root = map.insert('g').attr('id', 'legend_root2').attr("class", tmp_class_name).style("cursor", "grab");
    var rect_under_legend = legend_root.insert("rect");
    legend_root.insert('text').attr("id","legendtitle")
            .text(title || "Title").style("font", "bold 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + space_elem * 2 + boxgap)
            .attr("y", ypos)
    legend_root.insert('text').attr("id","legendsubtitle")
            .text(subtitle).style("font", "italic 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + space_elem * 2 + boxgap)
            .attr("y", ypos + 15);

    let ref_symbols = document.getElementById(layer).querySelectorAll(symbol_type),
        type_param = symbol_type === 'circle' ? 'r' : 'width';

    let id_ft_val_min = +ref_symbols[nb_features - 1].id.split(' ')[1].split('_')[1],
        id_ft_val_max = +ref_symbols[0].id.split(' ')[1].split('_')[1],
        val_min = +user_data[ref_layer_name][id_ft_val_min][field],
        val_max = +user_data[ref_layer_name][id_ft_val_max][field],
        val_1 = val_min + (val_max - val_min) / 3,
        val_2 = val_1 + (val_max - val_min) / 3,
        d_values = [val_max, val_2, val_1, val_min],
        z_scale = zoom.scale(),
        nb_decimals = get_nb_decimals(val_max),
        ref_symbols_params = [];

    let prop_values = prop_sizer3_e(d_values, current_layers[layer].size[0], current_layers[layer].size[1], symbol_type);

    prop_values.forEach((val,i) => {
        ref_symbols_params.push({value: d_values[i].toFixed(nb_decimals),
                                 size: val * z_scale});
    });

    var legend_elems = legend_root.selectAll('.legend')
                                  .append("g")
                                  .data(ref_symbols_params)
                                  .enter().insert('g')
                                  .attr('class', function(d, i) { return "legend_feature lg legend_" + i; });

    let max_size = ref_symbols_params[0].size,
        last_size = 0,
        last_pos = y_pos2;
    if(nested == "false"){
        if(symbol_type === "circle"){
            legend_elems
                  .append("circle")
                  .attr("cx", xpos + space_elem + boxgap + max_size / 2)
                  .attr("cy", function(d, i){
                        last_pos = (i * boxgap) + d.size + last_pos + last_size;
                        last_size = d.size;
                        return last_pos;
                        })
                  .attr('r', function(d, i){return d.size;})
                  .style({fill: "beige", stroke: "rgb(0, 0, 0)", "fill-opacity": 0.7});
            last_pos = y_pos2; last_size = 0;
            legend_elems.append("text")
                .attr("x", xpos + space_elem + boxgap + max_size * 1.5 + 5)
                .attr("y", function(d, i){
                            last_pos = (i * boxgap) + d.size + last_pos + last_size;
                            last_size = d.size;
                            return last_pos + (i * 2/3);
                            })
                .style({'alignment-baseline': 'middle' , 'font-size':'10px'})
                .text(function(d, i){return d.value;});

        } else if(symbol_type === "rect"){
            legend_elems
                  .append("rect")
                  .attr("x", function(d, i){ return xpos + space_elem + boxgap + max_size / 2 - d.size / 2;})
                  .attr("y", function(d, i){
                            last_pos = (i * boxgap) + (d.size / 2) + last_pos + last_size;
                            last_size = d.size;
                            return last_pos;
                            })
                  .attr('width', function(d, i){  return d.size;  })
                  .attr('height', function(d, i){  return d.size;  })
                  .style({fill: "beige", stroke: "rgb(0, 0, 0)", "fill-opacity": 0.7})
            last_pos = y_pos2; last_size = 0;
            let x_text_pos = xpos + space_elem + boxgap + max_size * 1.5 + 5;
            legend_elems.append("text")
                .attr("x", x_text_pos)
                .attr("y", function(d, i){
                            last_pos = (i * boxgap) + (d.size / 2) + last_pos + last_size;
                            last_size = d.size;
                            return last_pos + (d.size * 2 / 3);
                            })
                .style({'alignment-baseline': 'middle' , 'font-size':'10px'})
                .text(function(d, i){return d.value;});
        }
    } else if (nested == "true"){
        if(symbol_type === "circle"){
            legend_elems
                  .append("circle")
                  .attr("cx", xpos + space_elem + boxgap + max_size / 2)
                  .attr("cy", d => ypos + 45 + max_size + (max_size / 2) - d.size)
                  .attr('r', d => d.size)
                  .style({fill: "beige", stroke: "rgb(0, 0, 0)", "fill-opacity": 0.7});
            last_pos = y_pos2; last_size = 0;
            legend_elems.append("text")
                .attr("x", xpos + space_elem + boxgap + max_size * 1.5 + 5)
                .attr("y", d => ypos + 45 + max_size * 2 - (max_size / 2) - d.size * 2)
                .style({'alignment-baseline': 'middle' , 'font-size':'10px'})
                .text(d => d.value);
            last_pos = ypos + 30 + max_size + (max_size / 2);
        }
    }

    legend_root.call(drag_legend_func(legend_root));
    legend_root.attr("nested", nested);
    legend_root.append("g").attr("class", "legend_feature")
            .insert("text").attr("id", "legend_bottom_note")
            .attr({x: xpos, y: last_pos + 2*space_elem})
            .style("font", "11px 'Enriqueta', arial, serif")
            .html('Additional notes');
    make_underlying_rect(legend_root, rect_under_legend, xpos, ypos);
    legend_root.select('#legendtitle').text(title || "");
    make_legend_context_menu(legend_root, layer);
}

function createLegend_choro(layer, field, title, subtitle, boxgap = 4){
    var subtitle = subtitle || field,
        boxheight = 18,
        boxwidth = 18,
        xpos = w - (w / 8),
        ypos = 30,
        last_pos = null,
        y_pos2 =  ypos + boxheight,
        tmp_class_name = ["legend_feature", "lgdf_" + layer].join(' '),
        nb_class,
        data_colors_label;
    var legend_root = map.insert('g')
                        .attr('id', 'legend_root').attr("class", tmp_class_name)
                        .style("cursor", "grab");

    var rect_under_legend = legend_root.insert("rect");

    legend_root.attr("boxgap", boxgap);

    legend_root.insert('text').attr("id","legendtitle")
            .text(title || "Title").style("font", "bold 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + boxheight * 2)
            .attr("y", ypos)
    legend_root.insert('text').attr("id","legendsubtitle")
            .text(subtitle).style("font", "italic 12px 'Enriqueta', arial, serif")
            .attr("x", xpos + boxheight * 2)
            .attr("y", ypos + 15);

    if(current_layers[layer].renderer.indexOf('Categorical') > -1){
        data_colors_label = [];
        current_layers[layer].color_map.forEach( (v,k) => {
            data_colors_label.push({value: v[1], color: v[0]}); } );
        nb_class = current_layers[layer].color_map.size;
    } else if(current_layers[layer].renderer.indexOf('TypoSymbols') > -1){
        data_colors_label = [];
        current_layers[layer].symbols_map.forEach( (v,k) => {
            data_colors_label.push({value: k, image: v}); } );
        nb_class = current_layers[layer].symbols_map.size;
    } else {
        data_colors_label = current_layers[layer].colors_breaks.map(obj => {
            return {value: obj[0], color: obj[1]};
        });
        nb_class = current_layers[layer].colors_breaks.length;
    }
    var legend_elems = legend_root.selectAll('.legend')
                                  .append("g")
                                  .data(data_colors_label)
                                  .enter().insert('g')
                                  .attr('class', function(d, i) { return "legend_feature lg legend_" + i; });

    if(current_layers[layer].renderer.indexOf('TypoSymbols') == -1)
        legend_elems
              .append('rect')
              .attr("x", xpos + boxwidth)
              .attr("y", function(d, i){
                last_pos = y_pos2 + (i * boxgap) + (i * boxheight);
                return last_pos;
                })
              .attr('width', boxwidth)
              .attr('height', boxheight)
              .style('fill', function(d) { return d.color; })
              .style('stroke', function(d) { return d.color; });

    else
        legend_elems
              .append('image')
              .attr("x", xpos + boxwidth)
              .attr("y", function(d, i){
                last_pos = y_pos2 + (i * boxgap) + (i * boxheight);
                return last_pos;
                })
              .attr('width', boxwidth)
              .attr('height', boxheight)
//              .attr('width', d => d.image[1])
//              .attr('height', d => d.image[1])
              .attr("xlink:href", d => d.image[0]);

    legend_elems
      .append('text')
      .attr("x", xpos + boxwidth * 2 + 10)
      .attr("y", function(d, i){
        return y_pos2 + (i * boxgap) + (i+2/3) * boxheight;
        })
      .style({'alignment-baseline': 'middle' , 'font-size':'10px'})
      .text(function(d) { return d.value; });

    legend_root.append("g").attr("class", "legend_feature")
            .insert("text").attr("id", "legend_bottom_note")
            .attr({x: xpos, y: last_pos + 2*boxheight})
            .style("font", "11px 'Enriqueta', arial, serif")
            .text('Additional notes');
    legend_root.call(drag_legend_func(legend_root));
    make_underlying_rect(legend_root, rect_under_legend, xpos, ypos);
    legend_root.select('#legendtitle').text(title || "");
    make_legend_context_menu(legend_root, layer);
}

function createlegendEditBox(legend_id, layer_name){
    function bind_selections(){
        box_class = [layer_name, "_legend_popup"].join('');
        legend_node = document.querySelector(["#", legend_id, ".lgdf_", layer_name].join(''));
        title_content = legend_node.querySelector("#legendtitle");
        subtitle_content = legend_node.querySelector("#legendsubtitle");
        note_content = legend_node.querySelector("#legend_bottom_note");
//        source_content = document.getElementById("source_block");
        legend_node_d3 = d3.select(legend_node);
        legend_boxes = legend_node_d3.selectAll(["#", legend_id, " .lg"].join('')).select("text");
    };

    var box_class, legend_node, title_content,subtitle_content,note_content,source_content,legend_node_d3,legend_boxes;
    bind_selections();
    let original_params = {
        title_content: title_content.textContent, subtitle_content: subtitle_content.textContent,
        note_content: note_content.textContent }; //, source_content: source_content.textContent ? source_content.textContent : ""

    make_confirm_dialog("", "Confirm", "Cancel", "Layer style options", box_class, undefined, undefined, true)
        .then(function(confirmed){
            if(!confirmed){
                title_content.textContent = original_params.title_content;
                subtitle_content.textContent = original_params.subtitle_content;
                note_content.textContent = original_params.note_content;
//                source_content.textContent = original_params.source_content;
            } else {
                #TODO/FIXME : recompute the underlying rect taking into account the translate param if any
                make_underlying_rect(d3.select(legend_node), d3.select(legend_node.querySelector("#under_rect")));
            }
        });

    var box_body = d3.select([".", box_class].join('')),
        current_nb_dec;

    box_body.append('h3').html('Legend customization')
            .append('p').html('Legend title<br>')
            .insert('input')
            .attr("value", title_content.textContent)
            .on("keyup", function(){
                title_content.textContent = this.value
            });
    box_body.append('p').html('Variable name<br>')
            .insert('input')
            .attr("value", subtitle_content.textContent)
            .on("keyup", function(){
                subtitle_content.textContent = this.value
            });

    if(legend_boxes[0].length > 0 && current_layers[layer_name].renderer != "Categorical"
        && current_layers[layer_name].renderer != "TypoSymbols"){
        // Float precision for label in the legend
        // (actually it's not really the float precision but an estimation based on
        // the string representation of only two values but it will most likely do the job in many cases)
        let first_value = (legend_id.indexOf("2") === -1)
                            ? legend_boxes[0][0].__data__.value.split(" - ")[0]
                            : String(legend_boxes[0][0].__data__.value),
            fourth_value = (legend_id.indexOf("2") === -1)
                            ? legend_boxes[0][1].__data__.value.split(" - ")[1]
                            : String(legend_boxes[0][3].__data__.value),
            current_nb_dec1 = first_value.length - first_value.indexOf(".") - 1,
            current_nb_dec4 = fourth_value.length - fourth_value.indexOf(".") - 1;

        if(current_nb_dec4 === fourth_value.length && current_nb_dec1 === first_value.length) current_nb_dec = null;
        else current_nb_dec = current_nb_dec4 >= current_nb_dec1 ? current_nb_dec4 : current_nb_dec1;

        if(current_nb_dec){
            let max_nb_decimal = current_nb_dec > 8 ? current_nb_dec : 8;
            box_body.append('p')
                        .style("display", "inline")
                        .attr("id", "precision_change_txt")
                        .html(['Floating number rounding precision<br> ', current_nb_dec, ' '].join(''));
            if(legend_id === "legend_root" || legend_id === "legend_root_links")
                box_body.append('input')
                    .attr({id: "precision_range", type: "range", min: 0, max: max_nb_decimal, step: 1, value: current_nb_dec})
                    .style("display", "inline")
                    .on('change', function(){
                        let nb_float = +this.value,
                            dec_mult = +["1", Array(nb_float).fill("0").join('')].join('');
                        d3.select("#precision_change_txt")
                            .html(['Floating number rounding precision<br> ', nb_float, ' '].join(''))
                        for(let i = 0; i < legend_boxes[0].length; i++){
                            let values = legend_boxes[0][i].__data__.value.split(' - ');
                            legend_boxes[0][i].innerHTML = [Math.round(+values[0] * dec_mult) / dec_mult, " - ", Math.round(+values[1] * dec_mult) / dec_mult].join('');
                        }
                    });
            else if(legend_id === "legend_root2")
                box_body.append('input')
                    .attr({id: "precision_range", type: "range", min: 0, max: max_nb_decimal, step: 1, value: current_nb_dec})
                    .style("display", "inline")
                    .on('change', function(){
                        let nb_float = +this.value,
                            dec_mult = +["1", Array(nb_float).fill("0").join('')].join('');
                        d3.select("#precision_change_txt")
                            .html(['Floating number rounding precision<br> ', nb_float, ' '].join(''))
                        for(let i = 0; i < legend_boxes[0].length; i++){
                            let value = legend_boxes[0][i].__data__.value;
                            legend_boxes[0][i].innerHTML = String(Math.round(+value * dec_mult) / dec_mult);
                        }
                    });
        }
    }

    if(legend_id === "legend_root"){
        let lgd_choro = document.querySelector(["#legend_root.lgdf_", layer_name].join(''));
        let current_state = +lgd_choro.getAttribute("boxgap") == 0 ? true : false;
        box_body.insert("p").html("No gap between color boxes")
                .insert("input").attr("type", "checkbox")
                .attr("id", "style_lgd")
                .on("change", function(){
                    let rendered_field = current_layers[layer_name].rendered_field2 ? current_layers[layer_name].rendered_field2 :  current_layers[layer_name].rendered_field;
                    lgd_choro = document.querySelector(["#legend_root.lgdf_", layer_name].join(''));
                    let boxgap = +lgd_choro.getAttribute("boxgap") == 0 ? 4 : 0;
                    let transform_param = lgd_choro.getAttribute("transform"),
                        lgd_title = lgd_choro.querySelector("#legendtitle").innerHTML,
                        lgd_subtitle = lgd_choro.querySelector("#legendsubtitle").innerHTML;

                    lgd_choro.remove();
                    createLegend_choro(layer_name, rendered_field, lgd_title, lgd_subtitle, boxgap);
                    bind_selections();
                    if(transform_param)
                        document.querySelector(["#legend_root.lgdf_", layer_name].join('')).setAttribute("transform", transform_param);
                });
        document.getElementById("style_lgd").checked = current_state;
    } else if (legend_id == "legend_root2"){
        let lgd_symbol = document.querySelector(["#legend_root2.lgdf_", layer_name].join(''));
        let current_state = lgd_symbol.getAttribute("nested") == "true" ? true : false;
        box_body.insert("p").html("Nested symbols")
                .insert("input").attr("type", "checkbox")
                .attr("id", "style_lgd")
                .on("change", function(){
                    lgd_symbol = document.querySelector(["#legend_root2.lgdf_", layer_name].join(''))
                    let rendered_field = current_layers[layer_name].rendered_field;
                    let nested = lgd_symbol.getAttribute("nested") == "true" ? "false" : "true";
                    let transform_param = lgd_symbol.getAttribute("transform"),
                        lgd_title = lgd_symbol.querySelector("#legendtitle").innerHTML,
                        lgd_subtitle = lgd_symbol.querySelector("#legendsubtitle").innerHTML;

                    lgd_symbol.remove();
                    createLegend_symbol(layer_name, rendered_field, lgd_title, lgd_subtitle, nested);
                    bind_selections();
                    if(transform_param)
                        document.querySelector(["#legend_root2.lgdf_", layer_name].join('')).setAttribute("transform", transform_param);
                });
        document.getElementById("style_lgd").checked = current_state;
    }

//    box_body.insert("p").html("Display features count ")
//            .insert("input").attr("type", "checkbox")
//            .on("change", function(){
//                alert("to be done!");
//            });

    box_body.insert('p').html('Additionnal legend notes<br>')
            .insert('input').attr("value", note_content.textContent)
            .style("font-family", "12px Gill Sans Extrabold, sans-serif")
            .on("keyup", function(){
                note_content.textContent = this.value;
            });

//    box_body.insert('p').html('Source/authors informations:<br>')
//            .insert('input').attr("value", "Rendered by MAPOLOGIC")
//            .style("font", "italic 10px Gill Sans Extrabold, sans-serif")
//            .on("keyup", function(){
//                source_content.textContent = this.value;
//            });
}
