class IndexedDBOperation {
	static do = call => {
		let worker = new Worker('/FunnyFigures/indexedDB.js');
		let resolve;
		let reject;
		let promise = new Promise((_resolve, _reject) => {resolve = _resolve; reject = _reject;});
		let awaitingResponse = true;
		worker.onmessage = m => {
			if(awaitingResponse){
				awaitingResponse = false;
				resolve(m.data);
			}
		}
		worker.onerror = e => {
			if(awaitingResponse){
				awaitingResponse = false;
				reject(e);
			}
		}
		worker.postMessage(call);
		return promise;
	}
}