import  {notification} from 'antd';

export const Notification = (type, title, description) => {
    notification[type]({
      message: title,
      description: description,
      duration: 2,
    });
  };