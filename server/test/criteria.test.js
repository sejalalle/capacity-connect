import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCriterionDecision,criterionGaps} from '../src/services/criterionService.js';
const framework={levels:[1,2,3].map(value=>({value,criteria:[{criterionId:`L${value}`,description:`Synthetic level ${value} observable task`,rubricVersion:'proposed-v1',evidenceTypes:['PRACTICAL_TASK'],foundationalCriteria:value>1?[`L${value-1}`]:[]}]}))};
const decision={frameworkVersion:1,targetLevel:3,demonstratedLevel:2,rubricVersion:'proposed-v1',outcome:'DEMONSTRATED',status:'ACTIVE',criterionResults:[{criterionId:'L1',met:true},{criterionId:'L2',met:true},{criterionId:'L3',met:false}]};
test('reviewed lower level can be established while a higher criterion needs practice',()=>{
 assert.deepEqual(validateCriterionDecision(framework,decision,'PRACTICAL_TASK'),{configured:true});
 const rows=criterionGaps(framework,3,[decision],1);
 assert.deepEqual(rows.map(x=>x.status),['DEMONSTRATED','DEMONSTRATED','NEEDS_PRACTICE']);
 assert.deepEqual(criterionGaps(framework,3,[],1).map(x=>x.status),['NOT_ASSESSED','NOT_ASSESSED','NOT_ASSESSED']);
 assert.ok(criterionGaps(framework,3,[decision],2).every(x=>x.status==='NOT_ASSESSED'));
});
test('criteria cannot be substituted, duplicated, omitted or demonstrated with an unsupported evidence type',()=>{
 assert.throws(()=>validateCriterionDecision(framework,{...decision,demonstratedLevel:3},'PRACTICAL_TASK'),/requires reviewed evidence/);
 assert.throws(()=>validateCriterionDecision(framework,decision,'CERTIFICATE'),/Evidence type/);
 assert.throws(()=>validateCriterionDecision(framework,{...decision,criterionResults:decision.criterionResults.slice(1)},'PRACTICAL_TASK'),/Every target/);
 assert.throws(()=>validateCriterionDecision(framework,{...decision,criterionResults:[...decision.criterionResults,{criterionId:'OTHER',met:true}]},'PRACTICAL_TASK'),/unrelated/);
 assert.throws(()=>validateCriterionDecision(framework,{...decision,criterionResults:[...decision.criterionResults,decision.criterionResults[0]]},'PRACTICAL_TASK'),/Duplicate/);
 assert.throws(()=>validateCriterionDecision(framework,{...decision,rubricVersion:'wrong-version'},'PRACTICAL_TASK'),/unrelated/);
});
