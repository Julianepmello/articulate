import Immutable from 'seamless-immutable';

import {
  takeLatest,
  call,
  put,
  select,
} from 'redux-saga/effects';

import {
  loadAgentError,
  loadAgentSuccess,
  addAgentSuccess,
  addAgentError,
  deleteAgentError,
  deleteAgentSuccess,
  updateAgentSuccess,
  updateAgentError,
  trainAgent,
  trainAgentError,
} from '../App/actions';

import {
  LOAD_AGENT,
  ADD_AGENT,
  UPDATE_AGENT,
  DELETE_AGENT,
  TRAIN_AGENT,
} from '../App/constants';

import {
  makeSelectAgent,
  makeSelectCurrentAgent,
  makeSelectAgentWebhook,
  makeSelectAgentPostFormat,
  makeSelectAgentSettings,
} from '../App/selectors';

export function* getAgent(payload) {
  const { api, agentId } = payload;
  try {
    let response = yield call(api.agent.getAgentId, { id: agentId });
    const agent = response.obj;
    agent.domainClassifierThreshold = agent.domainClassifierThreshold * 100;
    response = yield call(api.agent.getAgentIdSettings, { id: agentId });
    const settings = response.obj;
    let webhook, postFormat;
    if (agent.useWebhook){
      response = yield call(api.agent.getAgentIdWebhook, { id: agentId });
      webhook = response.obj;
    }
    if (agent.usePostFormat){
      response = yield call(api.agent.getAgentIdPostformat, { id: agentId });
      postFormat = response.obj;
    }
    yield put(loadAgentSuccess({ agent, settings, webhook, postFormat }));
  } catch (err) {
    yield put(loadAgentError(err));
  }
}

function* postAgentWebhook(payload) {
  const agentWebhook = yield select(makeSelectAgentWebhook());
  const { api, id } = payload;
  try {
      yield call(api.agent.postAgentIdWebhook, { id, body: agentWebhook });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

function* postAgentPostFormat(payload) {
  const agentPostFormat = yield select(makeSelectAgentPostFormat());
  const { api, id } = payload;
  try {
      yield call(api.agent.postAgentIdPostformat, { id, body: agentPostFormat });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

function* putAgentWebhook(payload) {
  const agentWebhook = yield select(makeSelectAgentWebhook());
  const mutableAgentWebhook = Immutable.asMutable(agentWebhook);
  const { api, id } = payload;
  delete mutableAgentWebhook.agent;
  if (mutableAgentWebhook.id){ //TODO: Check why webhook have an id
    delete mutableAgentWebhook.id;
  }
  try {
      yield call(api.agent.putAgentIdWebhook, { id, body: mutableAgentWebhook });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

function* putAgentPostFormat(payload) {
  const agentPostFormat = yield select(makeSelectAgentPostFormat());
  const mutablePostFormat = Immutable.asMutable(agentPostFormat);
  const { api, id } = payload;
  delete mutablePostFormat.agent;
  if (mutablePostFormat.id){ //TODO: Check why post format have an id
    delete mutablePostFormat.id;
  }
  try {
      yield call(api.agent.putAgentIdPostformat, { id, body: mutablePostFormat });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

function* deleteAgentWebhook(payload) {
  const { api, id } = payload;
  try {
      yield call(api.agent.deleteAgentIdWebhook, { id });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

function* deleteAgentPostFormat(payload) {
  const { api, id } = payload;
  try {
      yield call(api.agent.deleteAgentIdPostformat, { id });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

function* putAgentSettings(payload) {
  const agentSettings = yield select(makeSelectAgentSettings());
  const { api, id } = payload;
  try {
      yield call(api.agent.putAgentIdSettings, { id, body: agentSettings });
  } catch (err) {
      yield put(addAgentError(err));
  }
}

export function* postAgent(payload) {
  let agent = yield select(makeSelectAgent());
  agent = agent.set('domainClassifierThreshold', agent.domainClassifierThreshold / 100);
  const { api } = payload;
  try {
      const response = yield call(api.agent.postAgent, { body: agent });
      if (agent.useWebhook){
        yield call(postAgentWebhook, { id: response.obj.id, api });
      }
      if (agent.usePostFormat){
        yield call(postAgentPostFormat, { id: response.obj.id, api });
      }
      yield call(putAgentSettings, { id: response.obj.id, api });
      yield call(api.domain.postDomain, { body: {
        agent: agent.agentName,
        domainName: 'default',
        enabled: true,
        actionThreshold: 0,
        extraTrainingData: false,
      }});
      yield put(addAgentSuccess(response.obj));
  } catch (err) {
      yield put(addAgentError(err));
  }
}

export function* putAgent(payload) {
  const agent = yield select(makeSelectAgent());
  const currentAgent = yield select(makeSelectCurrentAgent());
  const mutableAgent = Immutable.asMutable(agent, { deep: true });
  mutableAgent.domainClassifierThreshold = agent.domainClassifierThreshold / 100;
  const { api } = payload;
  delete mutableAgent.id;
  try {
      const response = yield call(api.agent.putAgentId, { id: currentAgent.id, body: mutableAgent });
      if (!currentAgent.useWebhook){
        if (agent.useWebhook) {
          yield call(postAgentWebhook, { id: currentAgent.id, api });
        }
      }
      else {
        if (currentAgent.useWebhook){
          if (!agent.useWebhook){
            yield call(deleteAgentWebhook, { id: currentAgent.id, api });
          }
          else {
            yield call(putAgentWebhook, { id: currentAgent.id, api });
          }
        }
      }
      if (!currentAgent.usePostFormat){
        if (agent.usePostFormat) {
          yield call(postAgentPostFormat, { id: currentAgent.id, api });
        }
      }
      else {
        if (currentAgent.usePostFormat){
          if (!agent.usePostFormat){
            yield call(deleteAgentPostFormat, { id: currentAgent.id, api });
          }
          else {
            yield call(putAgentPostFormat, { id: currentAgent.id, api });
          }
        }
      }
      yield call(putAgentSettings, { id: currentAgent.id, api });
      yield put(updateAgentSuccess(response.obj));
  } catch (err) {
      yield put(updateAgentError(err));
  }
}

export function* deleteAgent(payload) {
  const agent = yield select(makeSelectAgent());
  const { api } = payload;
  try {
    yield call(api.agent.deleteAgentId, { id: agent.id });
    yield put(deleteAgentSuccess());
  } catch (err) {
      yield put(deleteAgentError(err));
  }
}

export function* getTrainAgent(payload) {
  const agent = yield select(makeSelectAgent());
  const { api } = payload;
  try {
    yield call(api.agent.getAgentIdTrain, { id: agent.id });
  } catch (err) {
      yield put(trainAgentError(err));
  }
}

export default function* rootSaga() {
  yield takeLatest(LOAD_AGENT, getAgent);
  yield takeLatest(ADD_AGENT, postAgent);
  yield takeLatest(UPDATE_AGENT, putAgent);
  yield takeLatest(DELETE_AGENT, deleteAgent);
  yield takeLatest(TRAIN_AGENT, getTrainAgent);
};