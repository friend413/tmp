import webconfig from '../webconfig';
import axios from 'axios';

async function ajax(url, data, headers = {}) {
	try {
		if (url.indexOf("http") == -1) {
			url = webconfig.apiUrl + url;
		}
		let op = {
			method: data?'post':'get',
			url,
			headers
		};
		if (data) {
			op.data = data;
		}
		let res = await axios(op);
		let ret = res.data;
		if (typeof ret == 'string') {
			try {
				ret = JSON.parse(ret);

			} catch (e2) { }
		}
		if (ret.code == 200) {
			ret.msg = "ok";
		}
		return ret;
	} catch (e) {
		console.log(e);
		if (e.response?.data?.code == 403) {
			return { msg: 'Please relogin.' };
		}else if(e.response?.data?.data){
			return { msg:e.response.data.data };
		}else if(e.response?.data?.msg){
			return { msg:e.response.data.msg };
		}
		return { msg: e.message };
	}
}
export default ajax;
