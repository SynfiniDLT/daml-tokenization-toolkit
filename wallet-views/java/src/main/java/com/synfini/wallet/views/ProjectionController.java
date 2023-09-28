package com.synfini.wallet.views;

import com.synfini.wallet.views.bean.ProjectionStartBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("v1")
public class ProjectionController {

    @Autowired
    ProjectionStartBean projectionStartBean;

    @GetMapping("/projection/clear")
    public ResponseEntity<String> clear() {
        projectionStartBean.stopProjection();
        return null;
    }

    @GetMapping("/projection/start")
    public ResponseEntity<String> start() throws Exception {
        projectionStartBean.startProjection();
        return null;
    }
}
