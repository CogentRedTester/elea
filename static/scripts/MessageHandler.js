// a simple wrapper for a queue object
class Queue {
    constructor() {
        this.list = new Array();
    }
    empty() {
        return (this.list.length == 0);
    }
    push(item) {
        this.list.push(item);
    }
    pop() {
        return this.list.shift();
    }
}

// an object used to request a message receive
class RecvRequest {
    constructor(source) {
        this.source = source;
    }
}

// a message object
// the source field is filled in by the receiving thread, their message handler
// should add the id that that thread uses to refer to this one
class Message {
    constructor(destination, data, ctrl) {
        this.destination = destination;
        this.data = data;
        this.source = null;
        this.ctrl = ctrl || null;
    }
}

// manages incoming messages and receive requests
class MessageHandler {
    constructor() {
        this.ANY_CHILD_SOURCE = -1;
        this.PARENT_SOURCE = 0;

        this.idCounter = 1;
        this.pendingRequest = null;

        // initialise the message buffer with a queue from the parent
        this.messageBuffer = new Map([[0, new Queue()]]);

        // initialise the thread database with the current worker object
        // which will allow for messages to be sent to the parent
        this.threadMap = new Map([[0, self]]);
    }

    // sends a message to the specified location
    // if the destination is -1 then send to the parent
    // if the id is not valid then print a warning to the console
    sendMessage(msg) {
        let destThread = this.threadMap.get(msg.destination == -1 ? 0 : msg.destination);
        if (destThread == undefined) {
            console.warn("could not send message", msg, "- destination thread not found");
            return false;
        }

        // if (msg.ctrl == "log" && msg.source != null) {
        //     msg.data[0] = msg.source+':'+msg.data[0];
        // }
        destThread.postMessage(msg);
    }

    handleIncomingMessage(message) {
        message = message.data;

        // if the message came from a child and isn't addressed to the parent (this thread) then redirect
        // this will mostly be used for print statements, which need to be handled by the top level thread
        if (message.source != 0 && message.destination != 0) {
            this.sendMessage(message);
            return;
        }

        if (message.ctrl == "import") {
            this.sendMessage(new Message(message.source, self[message.data]));
            return;
        }

        // if there is no waiting request immediately buffer the message
        if (this.pendingRequest == null) {
            this.messageBuffer.get(message.source).push(message);
        }

        // if the waiting request is valid then continue the execution
        if (this.pendingRequest.source == message.source || (this.pendingRequest.source == this.ANY_CHILD_SOURCE && message.source != this.PARENT_SOURCE)) {
            this.pendingRequest = null;
            main.next(message);
        }

        // if it was not valid then buffer the message
        this.messageBuffer.get(message.source).push(message);
    }

    recvRequest(request) {
        let msg = undefined;
        
        // grab the message if it is already buffered
        // if the receiver is set to ANY then grab the first item in the buffer not from the parent
        if (request.source == Handler.ANY_CHILD_SOURCE) {
            for (const key in this.messageBuffer) {
                if (key == this.PARENT_SOURCE) continue;
                if (this.messageBuffer[key].length != 0) {
                    msg = this.messageBuffer[key].pop();
                }
            }
        } else{
            msg = this.messageBuffer.get(request.source).pop();
        }

        // if there is no message in the queue for the requested source
        if (msg == undefined) {
            this.pendingRequest = request;
            return;
        }

        // this will re-add the main function to the task queue to be run immediately
        // we can't call main directly because this request function will typically be called by main before it yields
        // we can't resume main until it properly yields, hence we add main to the task queue, and it will be run after
        setTimeout(function(msg) { main.next(msg); }, 0, msg);
    }

    // create a new worker thread with unique id and create the relevant values in the maps
    createThread(initialiser) {
        let handler = this;
        let id = this.idCounter++;
        let newThread = new Worker(initialiser);

        // ensure that messages from this thread specify the correct source
        newThread.addEventListener("message", function(msg) {
            msg.data.source = id;

            // we cannot use 'this' inside a callback function
            handler.handleIncomingMessage(msg);
        });

        this.threadMap.set(id, newThread);
        this.messageBuffer.set(id, new Queue());

        // sends the thread their id
        this.sendMessage( new Message(id, id) );
        return id;
    }

    // removes a thread from the database
    removeThread(id) {
        this.threadMap.get(id).terminate();
        this.messageBuffer.delete(id);
        this.threadMap.delete(id);
    }

    resetThreadIds() {
        this.idCounter = 1;
    }
}

// the variable argument syntax is not supported in IE as of 2021-08-27:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters
consolelog = function(...v) {
    Handler.sendMessage(new Message(-1, v, "log"));
}

consoleLog = function(...v) {
    Handler.sendMessage(new Message(-1, v, "log"));
}

// creates the message handler object for the calling script to use
var Handler = new MessageHandler();

// redirect messages from the parent to the message handler
// labels the source as having an ID of 0 - the parent's ID
self.onmessage = function(msg) {
    msg.data.source = 0;
    Handler.handleIncomingMessage(msg);
}