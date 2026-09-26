"use client"
import React, { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Calculator, Type, Plus } from 'lucide-react'

interface MathEditorProps {
  value: string; // The saved innerHTML
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  compact?: boolean;
}

export default function MathEditor({ value, onChange, placeholder, minHeight = '150px', compact = false }: MathEditorProps) {
  const [isLoaded, setIsLoaded] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  
  const onChangeRef = useRef(onChange);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Continuously track the user's cursor but ONLY if it is inside THIS specific editor
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current) {
        const range = sel.getRangeAt(0);
        // Only save the cursor position if they are actively clicking/typing inside this exact box
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Sync initial value (only once or when empty to avoid cursor jumps)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (!value) {
        editorRef.current.innerHTML = ''
      } else if (editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = value
      }
    }
  }, [value])

  // Global click outside to hide math keyboard robustly
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      // @ts-ignore
      if (window.mathVirtualKeyboard) {
        const target = e.target as HTMLElement;
        if (target && target.tagName && target.tagName.toLowerCase() !== 'math-field' && !target.closest('.ML__keyboard') && !target.closest('math-virtual-keyboard') && !target.closest('button')) {
          // @ts-ignore
          window.mathVirtualKeyboard.hide();
        }
      }
    }
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, [])

  // Attach event listeners to all math-fields inside the editor so they update the state when typed in
  useEffect(() => {
    if (!isLoaded || !editorRef.current) return

    const handleMathInput = (e: Event) => {
      if (editorRef.current) {
        const mathFields = editorRef.current.querySelectorAll('math-field')
        mathFields.forEach((mf: any) => {
          if (mf.value) {
            mf.setAttribute('value', mf.value)
            mf.textContent = mf.value
          } else {
            mf.removeAttribute('value')
            mf.textContent = ''
          }
        })
        onChangeRef.current(editorRef.current.innerHTML)
      }
    }

    const observer = new MutationObserver((mutations) => {
      const mathFields = editorRef.current?.querySelectorAll('math-field')
      mathFields?.forEach((mf: any) => {
        mf.setAttribute('math-virtual-keyboard-policy', 'auto')
        mf.removeEventListener('input', handleMathInput)
        mf.addEventListener('input', handleMathInput)

        const handleInteraction = (e: Event) => {
          e.stopPropagation()
          mf.focus()
          if (mf.executeCommand) {
            mf.executeCommand('focus')
          }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Backspace' && (!mf.value || mf.value.trim() === '')) {
            e.preventDefault();
            e.stopPropagation();
            deleteMathBox();
          }
        }

        const handleBeforeInput = (e: any) => {
          if (e.inputType === 'deleteContentBackward' && (!mf.value || mf.value.trim() === '')) {
            e.preventDefault();
            e.stopPropagation();
            deleteMathBox();
          }
        }

        const deleteMathBox = () => {
          const elementToDelete = mf.closest('span[contenteditable="false"]') || mf;
          const sel = window.getSelection();
          if (sel && elementToDelete.parentNode) {
            const range = document.createRange();
            range.setStartBefore(elementToDelete);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            // Update our saved range to match where they just deleted
            savedRangeRef.current = range.cloneRange();
          }
          elementToDelete.remove();
          handleInput();
          // @ts-ignore
          if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.hide();
        }

        const handleMoveOut = (e: any) => {
          if (e.detail && e.detail.direction === 'backward') {
            if (!mf.value || mf.value.trim() === '' || mf.value.includes('placeholder')) {
               deleteMathBox();
            } else {
               const elementToSkip = mf.closest('span[contenteditable="false"]') || mf;
               const sel = window.getSelection();
               if (sel && elementToSkip.parentNode) {
                 const range = document.createRange();
                 range.setStartBefore(elementToSkip);
                 range.collapse(true);
                 sel.removeAllRanges();
                 sel.addRange(range);
                 savedRangeRef.current = range.cloneRange();
                 mf.blur();
               }
            }
          } else if (e.detail && e.detail.direction === 'forward') {
             const elementToSkip = mf.closest('span[contenteditable="false"]') || mf;
             const sel = window.getSelection();
             if (sel && elementToSkip.parentNode) {
               const range = document.createRange();
               range.setStartAfter(elementToSkip);
               range.collapse(true);
               sel.removeAllRanges();
               sel.addRange(range);
               savedRangeRef.current = range.cloneRange();
               mf.blur();
             }
          }
        }

        mf.removeEventListener('mousedown', handleInteraction)
        mf.addEventListener('mousedown', handleInteraction)
        mf.removeEventListener('click', handleInteraction)
        mf.addEventListener('click', handleInteraction)
        
        mf.removeEventListener('keydown', handleKeyDown, true)
        mf.addEventListener('keydown', handleKeyDown, true)

        mf.removeEventListener('beforeinput', handleBeforeInput, true)
        mf.addEventListener('beforeinput', handleBeforeInput, true)

        mf.removeEventListener('move-out', handleMoveOut)
        mf.addEventListener('move-out', handleMoveOut)
      })
    })

    observer.observe(editorRef.current, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [isLoaded])

  const handleInput = () => {
    if (editorRef.current) {
      const mathFields = editorRef.current.querySelectorAll('math-field')
      mathFields.forEach((mf: any) => {
        if (mf.value) {
          mf.setAttribute('value', mf.value)
          mf.textContent = mf.value
        } else {
          mf.removeAttribute('value')
          mf.textContent = ''
        }
      })
      onChangeRef.current(editorRef.current.innerHTML)
    }
  }

  const exec = (command: string) => {
    document.execCommand(command, false)
    editorRef.current?.focus()
    handleInput()
  }

  const insertMath = (initialLatex?: string) => {
    if (!editorRef.current) return;
    
    let range: Range;
    
    // 100% FOOLPROOF FIX: We completely ignore the browser's global selection,
    // which gets extremely confused by React re-renders and toolbars.
    // Instead, we use the specific cursor position we meticulously saved
    // the last time the user clicked inside THIS specific text box.
    if (savedRangeRef.current) {
      range = savedRangeRef.current.cloneRange();
    } else {
      // If they never clicked inside this box yet, force it to the end of this box.
      editorRef.current.focus();
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }
    
    const mf: any = document.createElement('math-field');
    mf.style.display = 'inline-block';
    mf.style.verticalAlign = 'middle';
    mf.style.minWidth = '40px';
    mf.style.minHeight = '30px';
    mf.style.border = '1px solid #cbd5e1'; 
    mf.style.background = '#f8fafc'; 
    mf.style.borderRadius = '6px';
    mf.style.padding = '2px 6px';
    mf.style.margin = '0 2px';
    mf.style.cursor = 'text';
    mf.style.fontSize = '1.1em';
    mf.style.outline = 'none';
    mf.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.05)';
    
    mf.setAttribute('math-virtual-keyboard-policy', 'auto');
    mf.setAttribute('menu-toggle', 'none'); 
    
    if (initialLatex) {
      mf.value = initialLatex;
      mf.setAttribute('value', initialLatex);
    }
    
    const wrapper = document.createElement('span');
    wrapper.contentEditable = 'false';
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '0 4px';
    wrapper.appendChild(mf);
    
    wrapper.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      mf.focus();
      if (mf.executeCommand) mf.executeCommand('focus');
    });
    
    range.deleteContents();
    range.insertNode(wrapper);
    
    const space = document.createTextNode('\u00A0');
    wrapper.parentNode?.insertBefore(space, wrapper.nextSibling);
    
    range.setStartAfter(space);
    range.setEndAfter(space);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleInput();
    
    setTimeout(() => {
      mf.focus();
      if (mf.executeCommand) mf.executeCommand('focus');
    }, 50);
  }

  const insertMathSymbol = (latex: string) => {
    const activeEl = document.activeElement as any;
    // Only insert into the active math field if it actually belongs to THIS specific editor box.
    if (activeEl && activeEl.tagName && activeEl.tagName.toLowerCase() === 'math-field' && editorRef.current?.contains(activeEl)) {
      activeEl.insert(latex);
      activeEl.focus();
      handleInput();
    } else {
      insertMath(latex);
    }
  }

  if (!isLoaded) {
    return (
      <div className="w-full bg-slate-50 border border-slate-300 rounded-lg flex items-center justify-center text-slate-500 text-sm animate-pulse" style={{ minHeight }}>
        Loading Editor...
      </div>
    )
  }

  return (
    <div className="group/math border border-slate-300 rounded-lg overflow-hidden bg-white flex flex-col focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-all duration-200">
      <style dangerouslySetInnerHTML={{__html: `
        math-field::part(virtual-keyboard-toggle) {
          display: none !important;
        }
        math-field::part(menu-toggle) {
          display: none !important;
        }
      `}} />
      
      {/* Toolbar */}
      <div className={`${compact ? 'hidden group-focus-within/math:flex' : 'flex'} bg-slate-50 border-b border-slate-200 p-2 flex-wrap gap-2 items-center`}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-md text-sm flex items-center justify-center min-w-[32px] transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-md text-sm flex items-center justify-center min-w-[32px] transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-slate-300 mx-1"></div>

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertMathSymbol('^2'); }}
          className="px-2 py-1.5 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-serif font-bold transition-colors"
          title="Square (x²)"
        >
          x²
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertMathSymbol('_'); }}
          className="px-2 py-1.5 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-serif font-bold transition-colors"
          title="Subscript (x₁)"
        >
          x₁
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertMathSymbol('\\frac{#?}{#?}'); }}
          className="px-2 py-1.5 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-serif font-bold transition-colors"
          title="Fraction"
        >
          a/b
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertMathSymbol('\\sqrt{#?}'); }}
          className="px-2 py-1.5 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-serif font-bold transition-colors"
          title="Square Root"
        >
          √
        </button>
        
        <div className="h-6 w-px bg-slate-300 mx-1"></div>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            // @ts-ignore
            if (window.mathVirtualKeyboard) {
              // @ts-ignore
              const isVisible = window.mathVirtualKeyboard.visible;
              // @ts-ignore
              if (isVisible) window.mathVirtualKeyboard.hide();
              // @ts-ignore
              else window.mathVirtualKeyboard.show();
            }
          }}
          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-bold flex items-center transition-colors border border-indigo-200"
          title="Toggle Math Keyboard"
        >
          <Calculator className="w-4 h-4 mr-2" /> Toggle Math Keyboard
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertMath();
          }}
          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-bold flex items-center transition-colors border border-indigo-200"
          title="Insert Empty Math Box"
        >
          <Plus className="w-4 h-4 mr-2" /> Insert Math Box
        </button>
      </div>

      {/* Editor Area */}
      <div 
        className={`${compact ? 'p-2' : 'p-4'} bg-white prose max-w-none focus:outline-none overflow-y-auto`} 
        style={{ minHeight }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target && target.tagName && target.tagName.toLowerCase() !== 'math-field') {
            // @ts-ignore
            if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.hide();
          }

          if (document.activeElement === editorRef.current) return
          editorRef.current?.focus()
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="outline-none min-h-full"
          data-placeholder={placeholder || "Type your explanation here. Click 'Insert Math Box' to add an equation."}
          style={{ minHeight: '100%', wordBreak: 'break-word' }}
        />
      </div>
      
      {!compact && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 flex items-center">
          <Type className="w-3 h-3 mr-1" /> Paste regular text in the main white area. Only use the "Insert Math Box" for equations like x² or fractions.
        </div>
      )}
    </div>
  )
}
