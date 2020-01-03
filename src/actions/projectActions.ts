import request from 'superagent-bluebird-promise';
import { buildUrl, catchHandler } from './utils/fetch';
import t from '../trans';
import { busyToggle, success } from './appActions';
import { ACTION_TYPES } from './utils/ActionTypes';
import { ProjectModel } from '../components/project/models';


export function saveProject(project: ProjectModel, stayOnPage = false, callback?: (project: ProjectModel) => void) {
  return dispatch => {
    dispatch(busyToggle());
    return request.post(buildUrl('/projects'))
      .set('Content-Type', 'application/json')
      .send(project)
      .then(response => {
        dispatch({
          type: ACTION_TYPES.PROJECT_UPDATE,
          project: response.body
        })
        success(t('config.popupMessage'))
      })
      .catch(catchHandler)
      .then(() => dispatch(busyToggle.off()));
  };
}
