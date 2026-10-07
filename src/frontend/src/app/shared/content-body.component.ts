import { Component, computed, input } from '@angular/core';

/** Deliberately small editorial format. All content is interpolated text, never trusted HTML. */
@Component({selector:'ew-content-body',standalone:true,template:`
  <div class="space-y-5 mt-4 leading-8 text-slate-300">
    @for(block of blocks();track $index) {
      @switch(block.kind) {
        @case('heading') {<h3 class="text-2xl font-semibold text-white mt-8">{{block.text}}</h3>}
        @case('quote') {<blockquote class="border-s-2 border-[var(--ew-accent)] ps-5 italic">{{block.text}}</blockquote>}
        @case('list') {<ul class="list-disc ps-6 space-y-2">@for(line of block.lines;track $index){<li>{{line}}</li>}</ul>}
        @default {<p class="whitespace-pre-line">{{block.text}}</p>}
      }
    }
  </div>`})
export class ContentBodyComponent {
  readonly body=input('');
  readonly blocks=computed(()=>this.body().split(/\r?\n\s*\r?\n/).filter(Boolean).map(text=>{
    const lines=text.trim().split(/\r?\n/);
    if(lines.every(line=>/^[-*] /.test(line))) return {kind:'list',text:'',lines:lines.map(line=>line.slice(2))};
    if(/^#{2,3} /.test(text)) return {kind:'heading',text:text.replace(/^#{2,3} /,''),lines:[]};
    if(/^> /.test(text)) return {kind:'quote',text:text.replace(/^> /gm,''),lines:[]};
    return {kind:'paragraph',text,lines:[]};
  }));
}
