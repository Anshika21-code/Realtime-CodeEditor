import React, { use, useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../Actions";

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    let cmInstance;

    async function init() {
      cmInstance = Codemirror.fromTextArea(textareaRef.current, {
        mode: { name: "javascript", json: true },
        theme: "dracula",
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
      });

      editorRef.current = cmInstance;

      cmInstance.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code)
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    }

    init();

  
  }, []);

  useEffect(() => {
    if(socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null){
          editorRef.current.setValue(code);
        }
      });
    }

   return () => {
        if (socketRef.current) {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        }
    };
}, [socketRef]);

  return <textarea ref={textareaRef} id="realtimeEditor"></textarea>;
};

export default Editor;
