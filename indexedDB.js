'use strict'
importScripts('https://unpkg.com/dexie@3.0.3/dist/dexie.min.js');

const BODY_PARTS = {
	1: 'Head',
	2: 'Body',
	3: 'Feets',
	4: 'Right arm',
	5: 'Left arm'
}
const BODY_TYPES = {
	1: 'Three segment',
	2: 'Five segment'
}
const PARTS_IN_TYPE = {
	1: [1, 2, 3],
	2: [1, 2, 3, 4, 5]
}

let _dexieFunnyFigure = new Dexie('FunnyFigure');
_dexieFunnyFigure.version(1).stores({
	entries: '++id,timestamp,BodyType_ID,BodyPart_ID,derivedFrom,author,name,completeFigure',
	lines: '++id,Entity_ID,time,x1,y1,x2,y2,color',
});
_dexieFunnyFigure.open();
let callbacks = {
	StoreBodyPart: async data => {
		await _dexieFunnyFigure.transaction('rw', _dexieFunnyFigure.entries, _dexieFunnyFigure.lines, async()=>{
			if(data.type && data.lines && data.bodyPart){
				if(data.lines.length){
					_dexieFunnyFigure.entries.put({
						timestamp: Date.now(),
						BodyType_ID: data.type,
						BodyPart_ID: data.bodyPart,
						derivedFrom: data.derivedFrom,
						author: data.author,
						name: data.name,
						completeFigure: false
					}).then(async entryID => {
						data.lines.forEach(line => _dexieFunnyFigure.lines.put({
							Entity_ID: entryID,
							Time: line.time,
							x1: line.x1,
							y1: line.y1,
							x2: line.x2,
							y2: line.y2,
							Color: line.color
						}));
						let threeSegmentDone = data.type === 1 && data.bodyPart === 3;
						let fiveSegmentDone = data.type === 2 && data.bodyPart === 5;
						if(threeSegmentDone || fiveSegmentDone){
							while(entryID){
								await _dexieFunnyFigure.entries.update(entryID, {completeFigure: true});
								let entry = await _dexieFunnyFigure.entries.get({id: entryID});
								entryID = entry.derivedFrom;
							}
						}
						postMessage('DONE');
					}).catch(error => {
						console.error('StoreBodyPart', error);
						postMessage('NOT-PUBLISHED')
					});
				}else{
					postMessage('NOT-PUBLISHED');
				}
			}else{
				postMessage('NOT-PUBLISHED');
			}
		});
	},
	GetPartlyFigures: async data => {
		let unfinishedFigures = (
			(await _dexieFunnyFigure.entries.toArray())
			.filter(e => !e.completeFigure && e.BodyType_ID === data.type)
			.sort(e => -e.timestamp)
			.map(e => {
				return {
					id: e.id,
					part_ID: e.BodyPart_ID,
					type_ID: e.BodyType_ID,
					derivedFrom: e.derivedFrom
				}
			})
		);

		let derivedFroms = unfinishedFigures.map(e => e.derivedFrom);

		let type = null;
		let partID = null;
		let bodyPart = null;
		for(let index = 0; index < unfinishedFigures.length; index++){
			const unfinishedFigure = unfinishedFigures[index];
			if(!derivedFroms.includes(unfinishedFigure.id)){
				bodyPart = unfinishedFigure.id;
				type = unfinishedFigure.type_ID;
				partID = unfinishedFigure.part_ID + 1;
				break;
			}
		}

		if(bodyPart){
			postMessage({
				derivedFrom: bodyPart,
				bodyPartNext: partID,
				bodyPartNextName: BODY_PARTS[partID]
			});
		}
	},
	GetFigureLines: async data => {
		postMessage((await _dexieFunnyFigure.lines.toArray())
		.filter(l => l.Entity_ID === data.figureID)
		.map(l => {
			return {
				Time: l.Time,
				x1: l.x1,
				y1: l.y1,
				x2: l.x2,
				y2: l.y2,
				Color: l.Color ?? '000'
			}
		}));
	},
	GetCompleteFigures: async data => {
		postMessage((await _dexieFunnyFigure.entries.toArray())
		.filter(e => ((data.parentID === 0 ? e.derivedFrom === null : false) || e.derivedFrom === data.parentID) && e.completeFigure)
		.sort(e => -e.timestamp)
		.map(e => {
			return {
				name: ((e.name ? e.name : new Date(e.timestamp).toDateString()) + (e.author ? ' ('+e.author+')' : '')).trim(),
				ID: e.id
			}
		}));
	},
	IsLastPart: async data => {
		let parts = PARTS_IN_TYPE[data.type];
		postMessage(parts[parts.length-1] === data.bodyPart);
	}
}
for(const key in callbacks){
	if(Object.hasOwnProperty.call(callbacks, key)){
		if(callbacks[key].constructor.name !== 'AsyncFunction'){
			throw new Error('Callback "'+key+'" is not a `async`.');
		}
	}
}
onmessage = m => callbacks[m.data.operation](m.data.data).catch(err => console.error(err)).finally(()=>{postMessage(null);close();});